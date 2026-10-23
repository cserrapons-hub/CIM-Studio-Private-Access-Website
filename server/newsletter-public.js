import {subscriberType} from './newsletter-segmentation.js';
// Public relay: approved contract and legal policy do not bypass runtime or security gates.
import {json,readJson,validate,hash,Rejection} from './forms.js';
import {legal,legalReady,consent} from './settings.js';
import {recordNewsletterConsent,verifyConsentEvidence} from './getresponse-controlled.js';
import {newsletterPublicReady,newsletterRelease,acceptedNewsletterResponse} from './newsletter-release.js';
import {prepareNewsletterApi,NEWSLETTER_API_CONTRACT} from './getresponse-api-submission.js';
import {verifyNewsletter,readGetResponse,NewsletterVerificationError} from './getresponse-newsletter.js';
const verificationCodes=new Set(['campaign','contacts'].flatMap(prefix=>['request','timeout','network','redirect','http','response','configuration','identity','optin'].map(suffix=>prefix+'_'+suffix)));
const rejectionCodes=new Set(['method','origin','invalid','consent','challenge','subscriber_type','rate','conflict','pending']);
function publicPolicy(){return {approved:legalReady(),version:legal.version,es:{consent:consent.es.subscribe},en:{consent:consent.en.subscribe}};}
export async function handlePublicNewsletter(request,env,{fetcher=fetch,policy=publicPolicy(),profile=newsletterRelease,now=new Date(),logger=entry=>console.error(JSON.stringify(entry))}={}){
 // This correlation ID is generated here, never copied from visitor input or D1.
 const diagnosticId=crypto.randomUUID();
 let owned=null,stage='configuration',code='configuration_unavailable',providerStatus=null;
 const step=(name,errorCode,status=null)=>{stage=name;code=errorCode;providerStatus=status;};
 const report=error=>{
  let safeCode=error instanceof Rejection&&rejectionCodes.has(error.code)?error.code:code;
  let status=providerStatus;
  if(error instanceof NewsletterVerificationError&&verificationCodes.has(error.code)){safeCode=error.code;status=error.providerStatus;}
  if((stage==='turnstile'||stage==='getresponse_send')&&(error?.name==='TimeoutError'||error?.name==='AbortError'))safeCode='provider_timeout';
  try{logger({stage,code:safeCode,providerStatus:Number.isInteger(status)&&status>=100&&status<=599?status:null,requestId:diagnosticId});}catch{/* Diagnostics must not alter the public result. */}
 };
 try{
  if(request.method!=='POST'){step('validation','method');report();return json({error:'method'},405,{Allow:'POST'});}
  if(!newsletterPublicReady(env,policy.approved,profile)){report();return json({error:'unavailable'},503);}
  step('validation','validation_failed');
  const url=new URL(request.url);
  if(url.origin!==env.NEWSLETTER_ORIGIN||request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  const raw=await readJson(request),data=validate(raw,'subscribe');data.subscriberType=subscriberType(raw.subscriberType);if(raw.legalVersion!==policy.version)throw new Rejection('consent');
  step('d1_rate_limits','rate_limit_storage');
  const db=env.FORMS_DB,ip=request.headers.get('CF-Connecting-IP');code='client_ip_missing';if(!ip)throw new Rejection('unavailable',503);
  code='audit_hmac';
  const subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+data.email),bucket=Math.floor(now.getTime()/3600000);
  code='rate_limit_storage';
  for(const [label,limit] of [['ip:'+ip,8],['all',100],['email:'+subject,4]]){
   const key=await hash(env.AUDIT_HASH_SECRET,'public-newsletter-rate:'+label+':'+bucket);
   const row=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*3600000).first();if(row.count>limit)throw new Rejection('rate',429);
  }
  await db.prepare('DELETE FROM form_rate_limits WHERE expires_at<?').bind(now.getTime()).run();
  step('turnstile','provider_transport');
  const verify=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.token})});
  code='provider_http';providerStatus=verify.status;
  if(!verify.ok)throw new Rejection('unavailable',503);code='provider_response';const proof=await verify.json();
  code='challenge_invalid';
  if(proof.success!==true||proof.hostname!==url.hostname||proof.action!=='subscribe')throw new Rejection('challenge',403);
  step('d1_deduplication','deduplication_storage');
  const byId=await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE request_id=?').bind(raw.requestId).first();
  if(byId&&byId.subject_hash!==subject)throw new Rejection('conflict',409);
  const prior=byId||await db.prepare('SELECT * FROM newsletter_html_deliveries WHERE subject_hash=?').bind(subject).first();
  if(prior){
   const row=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(prior.request_id).first();
   if(!row||!await verifyConsentEvidence(row,env.AUDIT_HASH_SECRET))throw new Rejection('unavailable',503);
   if(byId&&(row.policy_version!==policy.version||row.language!==data.language))throw new Rejection('conflict',409);
   const receipt=await db.prepare('SELECT * FROM newsletter_http_receipts WHERE request_id=?').bind(prior.request_id).first();
   if(receipt&&await hash(env.AUDIT_HASH_SECRET,'newsletter-http-v1:'+JSON.stringify([prior.request_id,receipt.accepted_at,receipt.contract_version]))===receipt.evidence_mac)return json({ok:true,subscription:'request_recorded'},202);
   throw new Rejection('pending',409);
  }
  step('getresponse_prepare','request_configuration');
  const prepared=prepareNewsletterApi(env,data.email,data.subscriberType,{startTimeout:false});
  step('getresponse_campaign','campaign_verification');
  await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetcher);
  step('getresponse_contacts','contacts_verification');
  const contacts=await readGetResponse(fetcher,env.GETRESPONSE_API_KEY,'/contacts?'+new URLSearchParams({'query[email]':data.email,'query[campaignId]':'PL6jh',perPage:'100'}),'contacts');
  if(!Array.isArray(contacts)||contacts.length>=100||contacts.some(c=>!c||typeof c.email!=='string'||!c.campaign?.campaignId))throw new Rejection('unavailable',503);
  if(contacts.some(c=>c.email.trim().toLowerCase()===data.email&&c.campaign.campaignId==='PL6jh'))throw new Rejection('pending',409);
  step('consent_persistence','consent_storage');
  await recordNewsletterConsent(env,{...data,requestId:raw.requestId,legalVersion:raw.legalVersion},now,policy);
  step('d1_delivery_claim','delivery_claim_storage');
  const claim=await db.prepare("INSERT OR IGNORE INTO newsletter_html_deliveries(request_id,subject_hash,state,started_at,updated_at,lease_until) VALUES(?,?,'sending',?,?,?) RETURNING request_id").bind(raw.requestId,subject,now.toISOString(),now.toISOString(),Math.floor(now.getTime()/1000)+30).first();
  if(!claim)throw new Rejection('pending',409);owned=raw.requestId;
  step('d1_api_delivery','api_delivery_storage');
  await db.prepare("INSERT INTO newsletter_api_deliveries(request_id,contract_version,state,updated_at) VALUES(?,?,'sending',?)").bind(owned,NEWSLETTER_API_CONTRACT,now.toISOString()).run();
  step('getresponse_send','provider_transport');
  const response=await fetcher(prepared.url,{...prepared.options,signal:AbortSignal.timeout(12000)});
  code='provider_response';providerStatus=response.status;
  const accepted=acceptedNewsletterResponse(response,profile),status=response.status;
  try{await response.body?.cancel();}catch{}
  step('d1_delivery_result','delivery_result_storage',status);
  await db.prepare('UPDATE newsletter_html_deliveries SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind([400,401,403,404,405,413,415,422,429].includes(status)?'rejected':status>=500?'unknown':'unverified',status,new Date().toISOString(),owned).run();
  await db.prepare('UPDATE newsletter_api_deliveries SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind([400,401,403,404,405,413,415,422,429].includes(status)?'rejected':accepted?'accepted':'unknown',status,new Date().toISOString(),owned).run();
  step('getresponse_send','provider_rejected',status);
  if([400,401,403,404,405,413,415,422,429].includes(status))throw new Rejection(status===429?'rate':'unavailable',status===429?429:502);
  code='provider_uncertain';
  if(!accepted)throw new Rejection('pending',409);
  step('d1_http_receipt','receipt_storage',status);
  const at=new Date().toISOString(),mac=await hash(env.AUDIT_HASH_SECRET,'newsletter-http-v1:'+JSON.stringify([owned,at,profile.version]));
  await db.prepare('INSERT INTO newsletter_http_receipts(request_id,accepted_at,contract_version,evidence_mac) VALUES(?,?,?,?)').bind(owned,at,profile.version,mac).run();
  // Provider request acceptance is not DOI confirmation and never grants Founders.
  return json({ok:true,subscription:'confirmation_required'},202);
 }catch(error){
  report(error);
  if(owned&&!(error instanceof Rejection)){try{await env.FORMS_DB.prepare("UPDATE newsletter_html_deliveries SET state='unknown' WHERE request_id=?").bind(owned).run();await env.FORMS_DB.prepare("UPDATE newsletter_api_deliveries SET state='unknown' WHERE request_id=?").bind(owned).run();}catch{}}
  return json({error:error instanceof Rejection?error.code:owned?'pending':'unavailable'},error instanceof Rejection?error.status:owned?409:503);
 }
}
