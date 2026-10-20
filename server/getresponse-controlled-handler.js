// Restricted test only. No browser configuration enables public acquisition.
import {controlledTestBoundary} from './controlled-test.js';
import {legal} from './settings.js';
import {json,readJson,validate,hash,Rejection} from './forms.js';
import {recordControlledConsent} from './getresponse-controlled.js';
import {validNewsletterAllowlistSecret,authorisedNewsletterTestEmail} from './newsletter-test-allowlist.js';
const utc=()=>new Date();
function settings(env,policy){
 if(env.CONTROLLED_TEST_MODE!=='true'||env.NEWSLETTER_PREPARATION_ENABLED!=='true'||env.NEWSLETTER_CONTROLLED_SEND_ENABLED!=='true'||env.SITE_LIVE==='true'||!env.FORMS_DB||!policy.approved||typeof policy.version!=='string'||!policy.version.trim())return false;
 if(!['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','NEWSLETTER_TEST_ALLOWLIST_SECRET','NEWSLETTER_TEST_EMAIL_HASH','NEWSLETTER_DATA_KEY'].every(key=>typeof env[key]==='string'&&env[key].trim()))return false;
 if(!validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET)||env.NEWSLETTER_TEST_ALLOWLIST_SECRET===env.AUDIT_HASH_SECRET||env.AUDIT_HASH_SECRET.length<32||!/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH))return false;
 try{
  const origin=new URL(env.CONTROLLED_TEST_ORIGIN);
  if(origin.protocol!=='https:'||origin.hostname==='cimstudio.es'||origin.hostname.endsWith('.cimstudio.es')||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||atob(env.NEWSLETTER_DATA_KEY).length!==32)return false;
 }catch{return false;}
 return true;
}
async function limited(db,secret,label,limit,now){
 const bucket=Math.floor(now.getTime()/3600000),key=await hash(secret,'controlled-newsletter-rate:'+label+':'+bucket);
 const result=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*3600000).first();
 if(result.count>limit)throw new Rejection('rate',429);
 await db.prepare('DELETE FROM form_rate_limits WHERE expires_at<?').bind(now.getTime()).run();
}
const pending=()=>json({error:'pending',subscription:'pending_provider_verification',founders:'pending'},409);
async function previous(db,requestId,subject,policy,language){
 const byId=await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE request_id=?').bind(requestId).first();
 if(byId&&byId.subject_hash!==subject)throw new Rejection('conflict',409);
 if(byId){
  const consent=await db.prepare('SELECT policy_version,language FROM newsletter_consent_requests WHERE request_id=?').bind(requestId).first();
  if(!consent||consent.policy_version!==policy.version||consent.language!==language)throw new Rejection('conflict',409);
 }
 return byId||await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE subject_hash=?').bind(subject).first();
}
export async function handleControlledNewsletter(request,env,{fetcher=fetch,now=utc,policy=legal}={}){
 let owned=null;
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  if(!settings(env,policy))return json({error:'unavailable'},503);
  // Authenticate here too: do not rely only on the Pages middleware being invoked.
  const blocked=await controlledTestBoundary(request,env);if(blocked)return blocked;
  const origin=new URL(request.url).origin;
  if(origin!==new URL(env.CONTROLLED_TEST_ORIGIN).origin||request.headers.get('Origin')!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  const raw=await readJson(request),data=validate(raw,'subscribe');
  if(raw.legalVersion!==policy.version)throw new Rejection('consent');
  const at=now(),db=env.FORMS_DB,ip=request.headers.get('CF-Connecting-IP');
  if(!ip)throw new Rejection('unavailable',503);
  await limited(db,env.AUDIT_HASH_SECRET,'ip:'+ip,5,at);
  await limited(db,env.AUDIT_HASH_SECRET,'all',20,at);
  const subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+data.email);
  // Only the explicitly approved owner's test email is eligible for this route.
  // Independent HMAC key for authorisation ONLY; the audit-derived subject above
  // remains unchanged for records, evidence and deduplication. No legacy fallback.
  if(!await authorisedNewsletterTestEmail(env,data.email))throw new Rejection('unavailable',503);
  const challengeResponse=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.token})});
  if(!challengeResponse.ok)throw new Rejection('unavailable',503);
  const challenge=await challengeResponse.json();
  if(challenge.success!==true||challenge.hostname!==new URL(request.url).hostname||challenge.action!=='subscribe')throw new Rejection('challenge',403);
  // No retries on uncertain requests, including new request IDs for the same email.
  await db.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE state='sending' AND lease_until<?").bind(at.toISOString(),Math.floor(at.getTime()/1000)).run();
  if(await previous(db,raw.requestId,subject,policy,data.language))return pending();
  const recorded=await recordControlledConsent(env,{...data,requestId:raw.requestId,legalVersion:raw.legalVersion},at,policy);
  // Durable, atomic UNIQUE(subject_hash) claim BEFORE the external send. No lease reclaim.
  const claimed=await db.prepare("INSERT OR IGNORE INTO newsletter_html_deliveries(request_id,subject_hash,state,started_at,updated_at,lease_until) VALUES(?,?,'sending',?,?,?) RETURNING request_id").bind(raw.requestId,subject,at.toISOString(),at.toISOString(),Math.floor(at.getTime()/1000)+30).first();
  if(!claimed){
   if(!await previous(db,raw.requestId,subject,policy,data.language))throw new Rejection('unavailable',503);
   return pending();
  }
  owned=raw.requestId;
  const prepared=recorded.prepared;
  let response;
  try{response=await fetcher(prepared.url,{...prepared.options,signal:AbortSignal.timeout(12000)});}
  catch{
   await db.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();
   return pending();
  }
  // No invented GetResponse success contract. Never follow redirects, expose response
  // bodies, Location/Set-Cookie, provider errors or claim a DOI email was sent.
  const status=response.status;
  const rejected=[400,401,403,404,405,413,415,422,429].includes(status);
  const state=rejected?'rejected':status>=500?'unknown':'unverified';
  try{await response.body?.cancel();}catch{/* Do not read or log provider content. */}
  await db.prepare('UPDATE newsletter_html_deliveries SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind(state,status,now().toISOString(),owned).run();
  if(rejected)return json({error:status===429?'rate':'unavailable',founders:'pending'},status===429?429:502);
  return pending();
 }catch(error){
  // A persisted sending claim also prevents retries if the DB becomes unavailable.
  if(owned){try{await env.FORMS_DB.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();}catch{}}
  return json({error:error instanceof Rejection?error.code:'unavailable',founders:'pending'},error instanceof Rejection?error.status:503);
 }
}
