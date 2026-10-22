// Restricted test only. No browser configuration enables public acquisition.
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from './newsletter-test-policy.js';
import {json,readJson,validate,hash,Rejection} from './forms.js';
import {recordControlledConsent,verifyConsentEvidence} from './getresponse-controlled.js';
import {validNewsletterAllowlistSecret,authorisedNewsletterTestEmail} from './newsletter-test-allowlist.js';
import {prepareNewsletterApi,NEWSLETTER_API_CONTRACT} from './getresponse-api-submission.js';
import {verifyNewsletter,readGetResponse} from './getresponse-newsletter.js';
import {retryConfigured,useHtml404Retry} from './newsletter-html404-retry.js';
const utc=()=>new Date();
export function controlledNewsletterReady(env,policy=resolveNewsletterTestPolicy(env)){
 if(env.NEWSLETTER_API_REVIEWED!=='true'||env.GETRESPONSE_CAMPAIGN_ID!=='PL6jh'||typeof env.GETRESPONSE_API_KEY!=='string'||!env.GETRESPONSE_API_KEY.trim())return false;
 if(env.NEWSLETTER_TEST_LEGAL_APPROVED!=='true'||env.CONTROLLED_TEST_MODE!=='true'||env.NEWSLETTER_PREPARATION_ENABLED!=='true'||env.NEWSLETTER_CONTROLLED_SEND_ENABLED!=='true'||env.SITE_LIVE==='true'||!env.FORMS_DB||!policy.approved||typeof policy.version!=='string'||!policy.version.trim())return false;
 if(!['es','en'].every(lang=>['consent','privacy'].every(key=>typeof policy[lang]?.[key]==='string'&&Boolean(policy[lang][key].trim()))))return false;
 if(!['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','NEWSLETTER_TEST_ALLOWLIST_SECRET','NEWSLETTER_TEST_EMAIL_HASH','NEWSLETTER_DATA_KEY'].every(key=>typeof env[key]==='string'&&env[key].trim()))return false;
 if(!validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET)||env.NEWSLETTER_TEST_ALLOWLIST_SECRET===env.AUDIT_HASH_SECRET||env.AUDIT_HASH_SECRET.length<32||!/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH))return false;
 try{
  const origin=new URL(env.CONTROLLED_TEST_ORIGIN);
  if(origin.origin!=='https://cim-studio-test.pages.dev'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||atob(env.NEWSLETTER_DATA_KEY).length!==32)return false;
 }catch{return false;}
 return true;
}
async function limited(db,secret,label,limit,now){
 const bucket=Math.floor(now.getTime()/3600000),key=await hash(secret,'controlled-newsletter-rate:'+label+':'+bucket);
 const result=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*3600000).first();
 if(result.count>limit)throw new Rejection('rate',429);
 await db.prepare('DELETE FROM form_rate_limits WHERE expires_at<?').bind(now.getTime()).run();
}
const rejectedDelivery=row=>json({error:'provider_rejected',delivery:'rejected',diagnostic:{operation:'subscription',stage:row.api?'getresponse_api':'getresponse_html',code:'provider_http_rejected',...(Number.isInteger(row.provider_http_status)?{providerStatus:row.provider_http_status}:{})},founders:'pending'},502);
const accepted=()=>json({ok:true,delivery:'accepted',subscription:'request_accepted',confirmationVerified:false,founders:'pending'},202);
async function priorDelivery(db,row,secret){
 const consent=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(row.request_id).first();
 if(!consent||!await verifyConsentEvidence(consent,secret))throw new Rejection('unavailable',503);
 const api=await db.prepare('SELECT * FROM newsletter_api_deliveries WHERE request_id=?').bind(row.request_id).first();
 if(api?.contract_version===NEWSLETTER_API_CONTRACT&&api.state==='accepted'&&api.provider_http_status===202&&row.state==='unverified')return accepted();
 return row.state==='rejected'?rejectedDelivery({...row,api:Boolean(api)}):pending();
}
const pending=()=>json({error:'pending',subscription:'pending_provider_verification',delivery:'uncertain',confirmationVerified:false,founders:'pending'},409);
async function previous(db,requestId,subject,policy,language){
 const byId=await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE request_id=?').bind(requestId).first();
 if(byId&&byId.subject_hash!==subject)throw new Rejection('conflict',409);
 if(byId){
  const consent=await db.prepare('SELECT policy_version,language FROM newsletter_consent_requests WHERE request_id=?').bind(requestId).first();
  if(!consent||consent.policy_version!==policy.version||consent.language!==language)throw new Rejection('conflict',409);
 }
 return byId||await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE subject_hash=?').bind(subject).first();
}
export async function handleControlledNewsletter(request,env,{fetcher=fetch,now=utc,policy=resolveNewsletterTestPolicy(env)}={}){
 let owned=null,stage='configuration';
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  if(!controlledNewsletterReady(env,policy))return json({error:'unavailable',submission:'not_submitted',stage},503);
  // Authenticate here too: do not rely only on the Pages middleware being invoked.
  const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
  stage='request';
  const origin=new URL(request.url).origin;
  if(origin!==new URL(env.CONTROLLED_TEST_ORIGIN).origin||request.headers.get('Origin')!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  const raw=await readJson(request),data=validate(raw,'subscribe');
  if(raw.legalVersion!==policy.version)throw new Rejection('consent');
  const at=now(),db=env.FORMS_DB,ip=request.headers.get('CF-Connecting-IP');
  if(!ip)throw new Rejection('unavailable',503);
  stage='storage_rate';
  await limited(db,env.AUDIT_HASH_SECRET,'ip:'+ip,5,at);
  await limited(db,env.AUDIT_HASH_SECRET,'all',20,at);
  const subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+data.email);
  // Only the explicitly approved owner's test email is eligible for this route.
  // Independent HMAC key for authorisation ONLY; the audit-derived subject above
  // remains unchanged for records, evidence and deduplication. No legacy fallback.
  stage='allowlist';
  if(!await authorisedNewsletterTestEmail(env,data.email))throw new Rejection('unavailable',503);
  stage='turnstile';
  const challengeResponse=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.token})});
  if(!challengeResponse.ok)throw new Rejection('unavailable',503);
  const challenge=await challengeResponse.json();
  if(challenge.success!==true||challenge.hostname!==new URL(request.url).hostname||challenge.action!=='subscribe')throw new Rejection('challenge',403);
  stage='storage_read';
  // No retries on uncertain requests, including new request IDs for the same email.
  await db.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE state='sending' AND lease_until<?").bind(at.toISOString(),Math.floor(at.getTime()/1000)).run();
  const prior=await previous(db,raw.requestId,subject,policy,data.language);
  if(prior){
   if(retryConfigured(env))return useHtml404Retry(request,env,{parent:prior,subject,raw,data,policy,fetcher,now});
   return await priorDelivery(db,prior,env.AUDIT_HASH_SECRET);
  }
  // Exception mode must never fall through to an ordinary new-email subscription.
  if(env.NEWSLETTER_HTML404_RETRY_ENABLED==='true')return pending();
  // Fail before consent/claims/provider reads if the local API migration is missing.
  await db.prepare('SELECT request_id FROM newsletter_api_deliveries LIMIT 1').first();
  // Validate the destination and double opt-in on every NEW attempt. Never bypass an existing claim.
  const prepared=prepareNewsletterApi(env,data.email);
  stage='getresponse_campaign';
  await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetcher);
  const query=new URLSearchParams({'query[email]':data.email,'query[campaignId]':'PL6jh',perPage:'100'});
  stage='getresponse_contacts';
  const contacts=await readGetResponse(fetcher,env.GETRESPONSE_API_KEY,'/contacts?'+query,'contacts');
  if(!Array.isArray(contacts)||contacts.length>=100||contacts.some(c=>!c||typeof c!=='object'||typeof c.email!=='string'||!c.campaign?.campaignId))throw new Rejection('unavailable',503);
  if(contacts.some(c=>c.email.trim().toLowerCase()===data.email&&c.campaign.campaignId==='PL6jh'))return pending();
  // Commit evidence, the cross-transport claim and the API trace together.
  // A failed batch rolls back all three; no provider POST may precede it.
  stage='persistence';
  const evidence=await recordControlledConsent(env,{...data,requestId:raw.requestId,legalVersion:raw.legalVersion},at,policy,true);
  const committed=await db.batch([
   db.prepare("INSERT OR IGNORE INTO newsletter_html_deliveries(request_id,subject_hash,state,started_at,updated_at,lease_until) VALUES(?,?,'sending',?,?,?) RETURNING request_id").bind(raw.requestId,subject,at.toISOString(),at.toISOString(),Math.floor(now().getTime()/1000)+30),
   evidence.statement,
   db.prepare("INSERT OR IGNORE INTO newsletter_api_deliveries(request_id,contract_version,state,updated_at) SELECT request_id,?,'sending',? FROM newsletter_html_deliveries WHERE request_id=? AND subject_hash=?").bind(NEWSLETTER_API_CONTRACT,at.toISOString(),raw.requestId,subject)
  ]);
  if(!committed[0]?.results?.length){
   const prior=await previous(db,raw.requestId,subject,policy,data.language);
   if(!prior)throw new Rejection('unavailable',503);
   return await priorDelivery(db,prior,env.AUDIT_HASH_SECRET);
  }
  owned=raw.requestId;
  const saved=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(owned).first();
  if(!saved||saved.subject_hash!==subject||saved.language!==data.language||saved.policy_version!==policy.version||!await verifyConsentEvidence(saved,env.AUDIT_HASH_SECRET))throw new Rejection('unavailable',503);
  let response;
  try{response=await fetcher(prepared.url,{...prepared.options,signal:AbortSignal.timeout(12000)});}
  catch{
   await db.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();
   await db.prepare("UPDATE newsletter_api_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();
   return pending();
  }
  // Only API 202 means request acceptance, never DOI confirmation. Never expose response
  // bodies, Location/Set-Cookie, provider errors or claim a DOI email was sent.
  const status=response.status;
  const rejected=[400,401,403,404,405,413,415,422,429].includes(status);
  const state=rejected?'rejected':status>=500?'unknown':'unverified';
  try{await response.body?.cancel();}catch{/* Do not read or log provider content. */}
  await db.prepare('UPDATE newsletter_html_deliveries SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind(state,status,now().toISOString(),owned).run();
  await db.prepare('UPDATE newsletter_api_deliveries SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind(rejected?'rejected':status===202?'accepted':'unknown',status,now().toISOString(),owned).run();
  if(rejected)return rejectedDelivery({provider_http_status:status,api:true});
  if(status===202)return accepted();
  return pending();
 }catch(error){
  // A persisted sending claim also prevents retries if the DB becomes unavailable.
  if(owned){try{await env.FORMS_DB.prepare("UPDATE newsletter_html_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();await env.FORMS_DB.prepare("UPDATE newsletter_api_deliveries SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();}catch{}}
  if(owned)return pending();
  return json({error:error instanceof Rejection?error.code:'unavailable',submission:'not_submitted',stage,founders:'pending'},error instanceof Rejection?error.status:503);
 }
}
