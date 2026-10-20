const PATH = '/integrations/private-access/founders';
const encoder = new TextEncoder();
const hex = value => Array.from(new Uint8Array(value), x => x.toString(16).padStart(2, '0')).join('');
export async function digest(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export function validateFounderEvent(event) {
  const keys = ['version','event_id','email','confirmed_at','source','campaign_id','contact_id','proof_hash','verification_version'];
  if (!event || Object.keys(event).sort().join() !== keys.sort().join() || event.version !== 1 ||
      !/^[a-f0-9]{64}$/.test(event.event_id) || !/^[a-f0-9]{64}$/.test(event.proof_hash) ||
      typeof event.email !== 'string' || event.email !== event.email.trim().toLowerCase() ||
      event.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.email) ||
      event.source !== 'getresponse-double-opt-in' || event.verification_version !== 'getresponse-doi-v1' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(event.confirmed_at) ||
      !Number.isFinite(Date.parse(event.confirmed_at)) ||
      ![event.campaign_id,event.contact_id].every(x => typeof x === 'string' && /^[a-zA-Z0-9_.:-]{1,120}$/.test(x))) throw new Error('invalid_founder_event');
  return event;
}
export function serializeFounderEvent(event) { validateFounderEvent(event); return JSON.stringify(Object.fromEntries(Object.keys(event).sort().map(key=>[key,event[key]]))); }
export function deliveryConfig(env) {
  if (env.CIM_PRODUCTION_DELIVERY_ENABLED !== 'true') throw new Error('delivery_disabled');
  const url = new URL(env.CIM_PRODUCTION_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      (url.pathname !== '/' && url.pathname !== PATH) || !/^[a-zA-Z0-9_-]{1,64}$/.test(env.CIM_PRODUCTION_KEY_ID || '') ||
      (env.CIM_PRODUCTION_HMAC_SECRET || '').length < 32) throw new Error('invalid_delivery_config');
  return new URL(PATH,url).href;
}
export async function signedRequest(env,event,now=Date.now()) {
  const url = deliveryConfig(env); validateFounderEvent(event);
  const body = serializeFounderEvent(event), timestamp = String(Math.floor(Number(now)/1000));
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  const canonical = ['v1','POST',PATH,timestamp,nonce,await digest(body)].join('\n');
  const key = await crypto.subtle.importKey('raw',encoder.encode(env.CIM_PRODUCTION_HMAC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = hex(await crypto.subtle.sign('HMAC',key,encoder.encode(canonical)));
  return {url,options:{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','X-CIM-Key-Id':env.CIM_PRODUCTION_KEY_ID,'X-CIM-Timestamp':timestamp,'X-CIM-Nonce':nonce,'X-CIM-Signature':signature},body}};
}
export async function deliverFounderEvent(env,event,fetcher=fetch,now=Date.now()) {
  const {url,options} = await signedRequest(env,event,now);
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),10000);
  try {
    const response = await fetcher(url,{...options,signal:controller.signal});
    if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('Content-Type') || '')) throw new Error('delivery_failed');
    const text = await response.text(); if (text.length > 4096) throw new Error('invalid_ack');
    const ack = JSON.parse(text);
    if (ack.event_id !== event.event_id || !['accepted','duplicate','review','ineligible'].includes(ack.status) ||
        !(ack.customer_id === null || Number.isSafeInteger(ack.customer_id) && ack.customer_id > 0) ||
        ['accepted','duplicate'].includes(ack.status) && !Number.isSafeInteger(ack.customer_id)) throw new Error('invalid_ack');
    return {event_id:ack.event_id,status:ack.status,customer_id:ack.customer_id};
  } finally { clearTimeout(timer); }
}
