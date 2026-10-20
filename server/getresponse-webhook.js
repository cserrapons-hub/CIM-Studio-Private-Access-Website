import {json} from './forms.js';
import {legalReady} from './settings.js';
import {allowedSender} from './ip-ranges.js';
import {getresponseWebhookContract,normalizeWebhook} from './getresponse-webhook-contract.js';
import {founderSubject,FOUNDERS_CUTOFF} from './founders.js';
import {enqueueVerifiedEvent,drainOutbox} from './production-outbox.js';
const encoder=new TextEncoder();
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function hmac(secret,value){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
async function sameSecret(a,b){const x=await digest(a),y=await digest(b);let result=0;for(let i=0;i<x.length;i++)result|=x.charCodeAt(i)^y.charCodeAt(i);return result===0;}
async function bodyText(request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')||Number(request.headers.get('content-length'))>16384)throw Error();
 const reader=request.body?.getReader();if(!reader)throw Error();
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw Error();}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function handleGetResponseWebhook(request,env,fetcher=fetch,now=new Date(),contract=getresponseWebhookContract){
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  if(env.GETRESPONSE_WEBHOOK_ENABLED!=='true'||env.GETRESPONSE_WEBHOOK_IPS_REVIEWED!=='true'||
   !legalReady()||!contract.shapeVerified||!env.FORMS_DB||!env.GETRESPONSE_CAMPAIGN_ID||
   !env.GETRESPONSE_API_KEY||typeof env.AUDIT_HASH_SECRET!=='string'||env.AUDIT_HASH_SECRET.length<32)
   return json({error:'unavailable'},503);
  // cf metadata is supplied by Pages. Never authenticate with User-Agent, Origin or X-Forwarded-For.
  const ip=request.headers.get('CF-Connecting-IP');
  if(!request.cf?.colo||!allowedSender(ip,env.GETRESPONSE_WEBHOOK_CIDRS))return json({error:'forbidden'},403);
  // Optional only if GetResponse actually supports a configured secret header; never a token in the URL.
  if(env.GETRESPONSE_WEBHOOK_BEARER_SECRET){
   if(env.GETRESPONSE_WEBHOOK_BEARER_SECRET.length<32)return json({error:'unavailable'},503);
   const auth=request.headers.get('Authorization')||'';
   if(auth.length>1024||!await sameSecret(auth,'Bearer '+env.GETRESPONSE_WEBHOOK_BEARER_SECRET))return json({error:'forbidden'},403);
  }
  const db=env.FORMS_DB,at=now.toISOString(),bucket=Math.floor(now.getTime()/3600000);
  const rateKey=await hmac(env.AUDIT_HASH_SECRET,'gr-webhook:'+ip+':'+bucket);
  const rate=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(rateKey,(bucket+1)*3600000).first();
  if(rate.count>600)return json({error:'rate'},429,{'Retry-After':'3600'});
  await db.prepare('DELETE FROM form_rate_limits WHERE expires_at < ?').bind(now.getTime()).run();
  let text,event;
  try{text=await bodyText(request);event=normalizeWebhook(JSON.parse(text),contract);}catch{return json({error:'invalid'},400);}
  // Unsubscribe and other events are not entitlement revocations.
  if(!event)return new Response(null,{status:204});
  if(event.campaignId!==env.GETRESPONSE_CAMPAIGN_ID||event.occurredAt>at)return json({error:'invalid'},400);
  // Keep a minimal candidate before the account lookup, so an immediate unsubscribe
  // or temporary provider failure cannot erase the only notification received.
  if(event.occurredAt>=FOUNDERS_CUTOFF)return new Response(null,{status:204});
  const subject=await founderSubject(event.email,env.AUDIT_HASH_SECRET);
  const key=await digest(JSON.stringify([subject,event.campaignId,event.contactId,event.formId,event.occurredAt]));
  await db.prepare("INSERT INTO gr_webhook_receipts(event_key,subject_hash,campaign_id,contact_id,form_id,occurred_at,received_at,payload_sha256,state,reason) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING")
   .bind(key,subject,event.campaignId,event.contactId,event.formId,event.occurredAt,at,await digest(text),'quarantined','pending_account_and_confirmation_verification').run();
  // Provider IP ranges can be shared: bind the event to a real contact in OUR account.
  // A missing/inactive contact leaves the candidate quarantined for reconciliation.
  const response=await fetcher('https://api.getresponse.com/v3/contacts/'+encodeURIComponent(event.contactId),{
   headers:{'X-Auth-Token':'api-key '+env.GETRESPONSE_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)return json({error:'unavailable'},503);
  const contact=await response.json();
  if(contact.contactId!==event.contactId||contact.campaign?.campaignId!==env.GETRESPONSE_CAMPAIGN_ID||
   typeof contact.email!=='string'||contact.email.trim().toLowerCase()!==event.email)return json({error:'forbidden'},403);
  const proofVerified=contract.authenticationVerified===true&&contract.confirmationSemanticsVerified===true&&event.formId===contract.expectedFormId;
  if(proofVerified){
   // These review flags are code-controlled, not request/provider assertions.
   // Never derive an entitlement from list membership or receipt time.
   await db.prepare("UPDATE gr_webhook_receipts SET reason='awaiting_cim_production' WHERE event_key=?").bind(key).run();
   if(env.GETRESPONSE_WEBHOOK_GRANTS_ENABLED!=='true'||env.FOUNDERS_RECORDING_VERIFIED!=='true'||env.CIM_PRODUCTION_DELIVERY_ENABLED!=='true')
    return json({error:'unavailable'},503);
   const delivery={version:1,event_id:key,email:event.email,confirmed_at:event.occurredAt,
    source:'getresponse-double-opt-in',campaign_id:event.campaignId,contact_id:event.contactId,
    proof_hash:await digest(JSON.stringify([event.email,event.campaignId,event.contactId,event.formId,event.occurredAt])),verification_version:'getresponse-doi-v1'};
   // A durable encrypted temporary queue precedes acknowledgement. D1 is not Customers.
   await enqueueVerifiedEvent(env,delivery,now.getTime());
   await drainOutbox(env,fetcher,now.getTime());
   return json({received:true},202);
  }
  return json({received:true},202);
 }catch{
  // Do not acknowledge storage/provider uncertainty: permit a verified provider retry.
  // Retry policy itself must be checked in the real provider. Never log its body or personal data.
  return json({error:'unavailable'},503);
 }
}
