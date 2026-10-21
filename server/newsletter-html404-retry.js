// Private owner-only, one-shot exception. No route to issue/rearm/delete permits.
import {json,Rejection,hash} from './forms.js';
import {recordControlledConsent,verifyConsentEvidence} from './getresponse-controlled.js';
import {prepareNewsletterApi,NEWSLETTER_API_CONTRACT} from './getresponse-api-submission.js';
import {verifyNewsletter,readGetResponse} from './getresponse-newsletter.js';
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {authorisedNewsletterTestEmail} from './newsletter-test-allowlist.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const pending=()=>json({error:'pending',delivery:'uncertain',subscription:'pending_provider_verification',confirmationVerified:false,founders:'pending'},409);
export function retryConfigured(env){return env.NEWSLETTER_HTML404_RETRY_ENABLED==='true'&&uuid.test(env.NEWSLETTER_HTML404_RETRY_PARENT_ID||'');}
function validPermit(permit,parent,now){
 const t=Math.floor(now.getTime()/1000);
 return permit&&permit.parent_request_id===parent.request_id&&permit.subject_hash===parent.subject_hash&&uuid.test(permit.api_request_id)&&permit.api_request_id!==parent.request_id&&Number.isInteger(permit.issued_at)&&Number.isInteger(permit.expires_at)&&permit.issued_at<=t&&permit.expires_at>t&&permit.expires_at>permit.issued_at&&permit.expires_at-permit.issued_at<=900&&typeof permit.approved_by==='string'&&permit.approved_by.trim()&&permit.active===1&&permit.consumed_at===null;
}
async function eligibleParent(env,parent){
 if(!retryConfigured(env)||parent?.request_id!==env.NEWSLETTER_HTML404_RETRY_PARENT_ID||parent.state!=='rejected'||parent.provider_http_status!==404)return false;
 const db=env.FORMS_DB;
 if(await db.prepare('SELECT request_id FROM newsletter_api_deliveries WHERE request_id=?').bind(parent.request_id).first())return false;
 const evidence=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(parent.request_id).first();
 return evidence&&evidence.subject_hash===parent.subject_hash&&await verifyConsentEvidence(evidence,env.AUDIT_HASH_SECRET);
}
// Called only after private config authentication. Returns an opaque request ID, no email/hash.
export async function retryUiRequestId(env,now=new Date()){
 if(!retryConfigured(env))return null;
 const parent=await env.FORMS_DB.prepare('SELECT * FROM newsletter_html_deliveries WHERE request_id=?').bind(env.NEWSLETTER_HTML404_RETRY_PARENT_ID).first();
 if(!await eligibleParent(env,parent))return null;
 const permit=await env.FORMS_DB.prepare('SELECT * FROM newsletter_retry_permits WHERE parent_request_id=?').bind(parent.request_id).first();
 return validPermit(permit,parent,now)?permit.api_request_id:null;
}
function outcome(row){
 if(row.contract_version!==NEWSLETTER_API_CONTRACT)return pending();
 if(row.state==='accepted'&&row.provider_http_status===202)return json({ok:true,delivery:'accepted',subscription:'request_accepted',confirmationVerified:false,founders:'pending'},202);
 if(row.state==='rejected')return json({error:'provider_rejected',delivery:'rejected',diagnostic:{operation:'subscription',stage:'getresponse_api',code:'provider_http_rejected',...(Number.isInteger(row.provider_http_status)?{providerStatus:row.provider_http_status}:{})},founders:'pending'},502);
 return pending();
}
// Capability is issued only by the guarded handler after Basic/origin/allowlist/consent/Turnstile.
export async function useHtml404Retry(request,env,{parent,subject,raw,data,policy,fetcher,now}){
 let owned=null;
 try{
  if(!['NEWSLETTER_API_REVIEWED','NEWSLETTER_TEST_LEGAL_APPROVED','NEWSLETTER_PREPARATION_ENABLED','NEWSLETTER_CONTROLLED_SEND_ENABLED'].every(key=>env[key]==='true')||!policy.approved||await newsletterTestBoundary(request,env)||request.headers.get('Origin')!==new URL(request.url).origin||!await authorisedNewsletterTestEmail(env,data.email)||await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+data.email)!==subject)return pending();
  if(!await eligibleParent(env,parent)||parent.subject_hash!==subject||raw.requestId===parent.request_id)return pending();
  const db=env.FORMS_DB,permit=await db.prepare('SELECT * FROM newsletter_retry_permits WHERE parent_request_id=?').bind(parent.request_id).first();
  if(!permit||permit.subject_hash!==subject||permit.api_request_id!==raw.requestId)return pending();
  // Never reuse an ID from the common ledger or a different consent context.
  if(await db.prepare('SELECT request_id FROM newsletter_html_deliveries WHERE request_id=?').bind(raw.requestId).first())return pending();
  const prior=await db.prepare('SELECT * FROM newsletter_retry_attempts WHERE parent_request_id=?').bind(parent.request_id).first();
  if(prior){
   const evidence=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(prior.request_id).first();
   if(prior.request_id!==raw.requestId||prior.subject_hash!==subject||!evidence||evidence.subject_hash!==subject||evidence.policy_version!==policy.version||evidence.language!==data.language||!await verifyConsentEvidence(evidence,env.AUDIT_HASH_SECRET))return pending();
   return outcome(prior);
  }
  if(!validPermit(permit,parent,now()))return pending();
  // Construction and new consent evidence precede the claim; no external API call yet.
  const prepared=prepareNewsletterApi(env,data.email);
  await recordControlledConsent(env,{...data,requestId:raw.requestId,legalVersion:raw.legalVersion},now(),policy);
  const t=Math.floor(now().getTime()/1000);
  const consumed=await db.prepare("UPDATE newsletter_retry_permits SET consumed_at=?,active=0 WHERE parent_request_id=? AND api_request_id=? AND subject_hash=? AND active=1 AND consumed_at IS NULL AND issued_at<=? AND expires_at>? AND expires_at<=issued_at+900 AND NOT EXISTS (SELECT 1 FROM newsletter_retry_attempts WHERE parent_request_id=?) RETURNING api_request_id").bind(t,parent.request_id,raw.requestId,subject,t,t,parent.request_id).first();
  if(!consumed)return pending();
  owned=raw.requestId;
  await db.prepare("INSERT INTO newsletter_retry_attempts(request_id,parent_request_id,subject_hash,contract_version,state,started_at,updated_at) VALUES(?,?,?,?,'sending',?,?)").bind(owned,parent.request_id,subject,NEWSLETTER_API_CONTRACT,now().toISOString(),now().toISOString()).run();
  // Claim is spent even if these READS fail. Never restore active/consumed_at.
  await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetcher);
  const query=new URLSearchParams({'query[email]':data.email,'query[campaignId]':'PL6jh',perPage:'100'});
  const contacts=await readGetResponse(fetcher,env.GETRESPONSE_API_KEY,'/contacts?'+query,'contacts');
  if(!Array.isArray(contacts)||contacts.length>=100||contacts.some(c=>!c||typeof c.email!=='string'||!c.campaign?.campaignId)||contacts.some(c=>c.email.trim().toLowerCase()===data.email&&c.campaign.campaignId==='PL6jh'))throw new Rejection('pending',409);
  const response=await fetcher(prepared.url,{...prepared.options,signal:AbortSignal.timeout(12000)}),status=response.status;
  try{await response.body?.cancel();}catch{}
  const state=[400,401,403,404,405,413,415,422,429].includes(status)?'rejected':status===202?'accepted':'unknown';
  await db.prepare('UPDATE newsletter_retry_attempts SET state=?,provider_http_status=?,updated_at=? WHERE request_id=?').bind(state,status,now().toISOString(),owned).run();
  return outcome({contract_version:NEWSLETTER_API_CONTRACT,state,provider_http_status:status});
 }catch{
  if(owned){try{await env.FORMS_DB.prepare("UPDATE newsletter_retry_attempts SET state='unknown',updated_at=? WHERE request_id=?").bind(now().toISOString(),owned).run();}catch{}}
  return pending();
 }
}
