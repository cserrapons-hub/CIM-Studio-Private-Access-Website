import {validateFounderEvent,serializeFounderEvent,deliveryConfig,digest,deliverFounderEvent} from './production-delivery.js';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const b64 = bytes => btoa(String.fromCharCode(...bytes));
const unb64 = value => Uint8Array.from(atob(value),c=>c.charCodeAt(0));
function configuration(env) {
  deliveryConfig(env);
  const retention = Number(env.OUTBOX_MAX_PENDING_SECONDS), receipt = Number(env.OUTBOX_RECEIPT_SECONDS);
  if (env.OUTBOX_RECONCILIATION_REVIEWED !== 'true' || !env.FORMS_DB || !Number.isSafeInteger(retention) || retention < 60 || retention > 2592000 ||
      !Number.isSafeInteger(receipt) || receipt < 60 || receipt > 2592000 ||
      !env.OUTBOX_ENCRYPTION_KEY || unb64(env.OUTBOX_ENCRYPTION_KEY).length !== 32) throw new Error('invalid_outbox_config');
  return {retention,receipt};
}
async function encryptionKey(env) { return crypto.subtle.importKey('raw',unb64(env.OUTBOX_ENCRYPTION_KEY),'AES-GCM',false,['encrypt','decrypt']); }
async function encrypt(env,event) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(event.event_id)},await encryptionKey(env),encoder.encode(serializeFounderEvent(event)));
  return b64(iv)+'.'+b64(new Uint8Array(ciphertext));
}
async function decrypt(env,id,value) {
  const [iv,ciphertext] = value.split('.');
  return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:encoder.encode(id)},await encryptionKey(env),unb64(ciphertext))));
}
export async function enqueueVerifiedEvent(env,event,now=Date.now()) {
  const {retention} = configuration(env); validateFounderEvent(event);
  const seconds = Math.floor(Number(now)/1000), hash = await digest(serializeFounderEvent(event));
  await env.FORMS_DB.prepare(`INSERT OR IGNORE INTO production_outbox
    (event_id,payload_hash,encrypted_payload,state,created_at,next_attempt,expires_at)
    VALUES (?,?,?,'pending',?,?,?)`).bind(event.event_id,hash,await encrypt(env,event),seconds,seconds,seconds+retention).run();
  const row = await env.FORMS_DB.prepare('SELECT payload_hash,state FROM production_outbox WHERE event_id=?').bind(event.event_id).first();
  if (!row || row.payload_hash !== hash) throw new Error('conflicting_event');
  if (row.state === 'delivered') {
    const receipts = await env.FORMS_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gr_webhook_receipts'").bind().first();
    if (receipts) await env.FORMS_DB.prepare('DELETE FROM gr_webhook_receipts WHERE event_key=?').bind(event.event_id).run();
  }
  return {event_id:event.event_id,state:row.state};
}
export async function drainOutbox(env,fetcher=fetch,now=Date.now()) {
  const {receipt} = configuration(env), seconds = Math.floor(Number(now)/1000);
  await env.FORMS_DB.prepare("DELETE FROM production_outbox WHERE state='delivered' AND receipt_until<=?").bind(seconds).run();
  await env.FORMS_DB.prepare("UPDATE production_outbox SET state='reconciliation',last_error='pending_retention_expired',lease_token=NULL WHERE state IN ('pending','sending') AND expires_at<=?").bind(seconds).run();
  const rows = (await env.FORMS_DB.prepare("SELECT * FROM production_outbox WHERE state IN ('pending','sending') AND next_attempt<=? AND lease_until<=? AND expires_at>? ORDER BY created_at LIMIT 20").bind(seconds,seconds,seconds).all()).results;
  const result = {delivered:0,retry:0,reconciliation:0};
  for (const row of rows) {
    const token = crypto.randomUUID();
    const claimed = await env.FORMS_DB.prepare("UPDATE production_outbox SET state='sending',lease_until=?,lease_token=?,attempts=attempts+1 WHERE event_id=? AND state IN ('pending','sending') AND lease_until<=?").bind(seconds+30,token,row.event_id,seconds).run();
    if (!claimed.meta.changes) continue;
    try {
      const event = await decrypt(env,row.event_id,row.encrypted_payload);
      const ack = await deliverFounderEvent(env,event,fetcher,now);
      if (ack.status === 'accepted' || ack.status === 'duplicate') {
        const receipts = await env.FORMS_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gr_webhook_receipts'").bind().first();
        if (receipts) await env.FORMS_DB.prepare('DELETE FROM gr_webhook_receipts WHERE event_key=?').bind(row.event_id).run();
        await env.FORMS_DB.prepare("UPDATE production_outbox SET state='delivered',encrypted_payload=NULL,last_error=NULL,lease_token=NULL,lease_until=0,receipt_until=? WHERE event_id=? AND lease_token=?").bind(seconds+receipt,row.event_id,token).run();
        result.delivered++;
      } else {
        await env.FORMS_DB.prepare("UPDATE production_outbox SET state='reconciliation',last_error=?,lease_token=NULL,lease_until=0 WHERE event_id=? AND lease_token=?").bind('receiver_'+ack.status,row.event_id,token).run(); result.reconciliation++;
      }
    } catch {
      const delay = Math.min(3600,30*2**Math.min(row.attempts,7));
      await env.FORMS_DB.prepare("UPDATE production_outbox SET state='pending',next_attempt=?,last_error='delivery_failed',lease_token=NULL,lease_until=0 WHERE event_id=? AND lease_token=?").bind(seconds+delay,row.event_id,token).run(); result.retry++;
    }
  }
  const count = await env.FORMS_DB.prepare("SELECT COUNT(*) AS total FROM production_outbox WHERE state='reconciliation'").bind().first();
  result.reconciliation = count.total;
  return result;
}
