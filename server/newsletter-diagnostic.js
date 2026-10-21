// Temporary private diagnostic: SELECT-only, no fetch, no logging, no activation.
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from './newsletter-test-policy.js';
import {validNewsletterAllowlistSecret} from './newsletter-test-allowlist.js';
import {verifyConsentEvidence} from './getresponse-controlled.js';
import {json} from './forms.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const present=v=>typeof v==='string'&&Boolean(v.trim());
export async function newsletterDiagnostic(request,env,{policy=resolveNewsletterTestPolicy(env),now=new Date()}={}){
 const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
 if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 const failedChecks=[];
 const check=(name,valid)=>{if(!valid)failedChecks.push(name);};
 for(const name of ['NEWSLETTER_API_REVIEWED','NEWSLETTER_TEST_LEGAL_APPROVED','NEWSLETTER_PREPARATION_ENABLED','NEWSLETTER_CONTROLLED_SEND_ENABLED','CONTROLLED_TEST_MODE','NEWSLETTER_HTML404_RETRY_ENABLED'])check(name,env[name]==='true');
 check('SITE_LIVE',env.SITE_LIVE!=='true');check('GETRESPONSE_CAMPAIGN_ID',env.GETRESPONSE_CAMPAIGN_ID==='PL6jh');
 for(const name of ['GETRESPONSE_API_KEY','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','NEWSLETTER_DATA_KEY','NEWSLETTER_TEST_EMAIL_HASH'])check(name,present(env[name]));
 check('FORMS_DB',typeof env.FORMS_DB?.prepare==='function');
 check('AUDIT_HASH_SECRET',typeof env.AUDIT_HASH_SECRET==='string'&&env.AUDIT_HASH_SECRET.length>=32);
 check('NEWSLETTER_TEST_ALLOWLIST_SECRET',validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET));
 check('ALLOWLIST_AUDIT_SEPARATION',env.NEWSLETTER_TEST_ALLOWLIST_SECRET!==env.AUDIT_HASH_SECRET);
 check('NEWSLETTER_TEST_EMAIL_HASH_FORMAT',typeof env.NEWSLETTER_TEST_EMAIL_HASH==='string'&&/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH));
 let keyValid=false;try{keyValid=typeof env.NEWSLETTER_DATA_KEY==='string'&&atob(env.NEWSLETTER_DATA_KEY).length===32;}catch{}
 check('NEWSLETTER_DATA_KEY_FORMAT',keyValid);
 let originValid=false;try{const u=new URL(env.CONTROLLED_TEST_ORIGIN);originValid=u.origin==='https://cim-studio-test.pages.dev'&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password;}catch{}
 check('CONTROLLED_TEST_ORIGIN',originValid);check('PRIVATE_POLICY_APPROVED',policy.approved===true);check('PRIVATE_POLICY_VERSION',present(policy.version));
 for(const lang of ['es','en'])for(const field of ['consent','privacy'])check('PRIVATE_POLICY_'+lang.toUpperCase()+'_'+field.toUpperCase(),present(policy[lang]?.[field]));
 const parentIdValid=typeof env.NEWSLETTER_HTML404_RETRY_PARENT_ID==='string'&&uuid.test(env.NEWSLETTER_HTML404_RETRY_PARENT_ID);
 check('RETRY_PARENT_ID_FORMAT',parentIdValid);
 const result={configuration:failedChecks.length?'invalid':'valid',failedChecks,d1:'not_checked',consentHmac:'not_checked',permit:'not_checked'};
 if(typeof env.FORMS_DB?.prepare==='function'){
  const db=env.FORMS_DB;
  // Static table/column names only; SQL parameters never reach the response.
  const queries=[['newsletter_html_deliveries','request_id'],['newsletter_consent_requests','request_id'],['newsletter_api_deliveries','request_id'],['newsletter_retry_permits','parent_request_id']];
  const values=await Promise.allSettled(queries.map(async([table,column],index)=>{
   if(parentIdValid)return db.prepare('SELECT * FROM '+table+' WHERE '+column+'=?').bind(env.NEWSLETTER_HTML404_RETRY_PARENT_ID).first();
   return db.prepare('SELECT '+column+' FROM '+table+' LIMIT 0').first();
  }));
  result.d1=values.every(v=>v.status==='fulfilled')?'ok':'error';
  if(parentIdValid&&values[1].status==='fulfilled'){
   const evidence=values[1].value;
   if(!evidence)result.consentHmac='invalid';
   else if(typeof env.AUDIT_HASH_SECRET==='string'&&env.AUDIT_HASH_SECRET.length>=32){try{result.consentHmac=await verifyConsentEvidence(evidence,env.AUDIT_HASH_SECRET)?'valid':'invalid';}catch{result.consentHmac='error';}}
  }
  if(parentIdValid&&values.every(v=>v.status==='fulfilled')){
   const [parent,evidence,api,permit]=values.map(v=>v.value);
   const t=Math.floor(now.getTime()/1000);
   const structural=parent&&parent.state==='rejected'&&parent.provider_http_status===404&&!api&&evidence&&evidence.subject_hash===parent.subject_hash&&permit&&permit.parent_request_id===parent.request_id&&permit.subject_hash===parent.subject_hash&&uuid.test(permit.api_request_id)&&permit.api_request_id!==parent.request_id&&Number.isInteger(permit.issued_at)&&Number.isInteger(permit.expires_at)&&permit.issued_at<=t&&permit.expires_at>permit.issued_at&&permit.expires_at-permit.issued_at<=900&&present(permit.approved_by)&&permit.active===1&&permit.consumed_at===null;
   result.permit=!structural?'invalid':permit.expires_at<=t?'expired':'valid';
  }
 }
 return json(result,200,{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'});
}
