// Read-only GetResponse observations. Never calls a subscription endpoint or grants Founders.
import {json,readJson,hash,Rejection} from './forms.js';
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from './newsletter-test-policy.js';
import {authorisedNewsletterTestEmail,validNewsletterAllowlistSecret} from './newsletter-test-allowlist.js';
import {verifyNewsletter,NewsletterVerificationError} from './getresponse-newsletter.js';
import {inspectNewsletterContact} from './getresponse-controlled.js';
const api='https://api.getresponse.com/v3';
// Same preflight in config and handler. Does not access D1/provider or check an email.
export function observationConfigurationIssue(env,policy=resolveNewsletterTestPolicy(env)){
 if(env.NEWSLETTER_OBSERVATIONS_ENABLED!=='true')return 'observation_disabled';
 if(!policy.approved||typeof policy.version!=='string'||!policy.version.trim())return 'private_policy_disabled';
 if(!env.FORMS_DB||typeof env.FORMS_DB.prepare!=='function')return 'storage_configuration';
 if(typeof env.GETRESPONSE_API_KEY!=='string'||!env.GETRESPONSE_API_KEY.trim()||typeof env.GETRESPONSE_CAMPAIGN_ID!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(env.GETRESPONSE_CAMPAIGN_ID))return 'campaign_configuration';
 if(typeof env.AUDIT_HASH_SECRET!=='string'||env.AUDIT_HASH_SECRET.length<32)return 'audit_configuration';
 if(!validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET)||env.NEWSLETTER_TEST_ALLOWLIST_SECRET===env.AUDIT_HASH_SECRET||typeof env.NEWSLETTER_TEST_EMAIL_HASH!=='string'||!/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH))return 'allowlist_configuration';
 return null;
}
export async function observeNewsletter(request,env,{fetcher=fetch,now=new Date(),policy=resolveNewsletterTestPolicy(env)}={}){
 let stage='configuration',code='observation_unavailable',providerStatus=null;
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
  const issue=observationConfigurationIssue(env,policy);
  if(issue){code=issue;throw new Rejection('unavailable',503);}
  stage='request';code='request_invalid';
  if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site'){code='origin_rejected';throw new Rejection('origin',403);}
  const raw=await readJson(request);
  if(!['before','after','unsubscribe'].includes(raw.phase)||typeof raw.email!=='string')throw new Rejection('invalid');
  stage='allowlist';code='email_not_authorised';
  if(!await authorisedNewsletterTestEmail(env,raw.email))throw new Rejection('invalid');
  const email=raw.email.trim().toLowerCase(),subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+email);
  stage='storage_rate_read';code='storage_read';
  const recent=await env.FORMS_DB.prepare('SELECT COUNT(*) n FROM newsletter_observations WHERE subject_hash=? AND observed_at>?').bind(subject,new Date(now.getTime()-3600000).toISOString()).first();
  if(!recent||!Number.isFinite(Number(recent.n)))throw new Rejection('unavailable',503);
  if(recent.n>=12){code='observation_rate';throw new Rejection('rate',429);}
  const query=new URLSearchParams({'query[email]':email,'query[campaignId]':env.GETRESPONSE_CAMPAIGN_ID,perPage:'100'});
  // Official SDK supports both filters. Email remains server-to-server, never logged.
  stage='getresponse_campaign';code='campaign_network';
  await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetcher);
  stage='getresponse_contacts';code='contacts_network';
  const response=await fetcher(api+'/contacts?'+query,{method:'GET',headers:{'X-Auth-Token':'api-key '+env.GETRESPONSE_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok){code='contacts_http';providerStatus=response.status;try{await response.body?.cancel();}catch{}throw new Rejection('unavailable',503);}
  code='contacts_response';const contacts=await response.json();
  if(!Array.isArray(contacts)||contacts.some(c=>!c||typeof c!=='object'||Array.isArray(c)))throw new Rejection('unavailable',503);
  if(contacts.length>=100){code='contacts_incomplete';throw new Rejection('unavailable',503);}
  const matches=contacts.filter(c=>typeof c.email==='string'&&c.email.trim().toLowerCase()===email&&c.campaign?.campaignId===env.GETRESPONSE_CAMPAIGN_ID);
  if(matches.length>1){code='contacts_ambiguous';throw new Rejection('conflict',409);}
  const contact=matches[0],check=contact?inspectNewsletterContact(contact,{email,campaignId:env.GETRESPONSE_CAMPAIGN_ID}):{customConsentStored:false};
  const date=value=>typeof value==='string'&&value.length<=80&&Number.isFinite(Date.parse(value))?value:null;
  const evidence={version:1,id:crypto.randomUUID(),phase:raw.phase,observedAt:now.toISOString(),campaignId:env.GETRESPONSE_CAMPAIGN_ID,matchingContactFound:Boolean(contact),contactId:typeof contact?.contactId==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(contact.contactId)?contact.contactId:null,customConsentStored:check.customConsentStored,providerCreatedOn:date(contact?.createdOn),providerChangedOn:date(contact?.changedOn),confirmationVerified:false,originalConfirmationAt:null,founders:'pending'};
  stage='storage_consent_read';code='storage_read';
  const requestRow=await env.FORMS_DB.prepare('SELECT request_id FROM newsletter_consent_requests WHERE subject_hash=? ORDER BY accepted_at DESC LIMIT 1').bind(subject).first();
  const text=JSON.stringify(evidence),mac=await hash(env.AUDIT_HASH_SECRET,'newsletter-observation-v1:'+text);
  stage='storage_observation_write';code='storage_write';
  await env.FORMS_DB.prepare('INSERT INTO newsletter_observations(id,request_id,subject_hash,phase,observed_at,evidence_json,evidence_mac) VALUES(?,?,?,?,?,?,?)').bind(evidence.id,requestRow?.request_id||null,subject,raw.phase,evidence.observedAt,text,mac).run();
  return json({ok:true,observation:evidence});
 }catch(error){
  if(error instanceof NewsletterVerificationError){code=error.code;providerStatus=error.providerStatus;}
  // Only code-owned labels/status are exposed after the private boundary. No logs,
  // provider payloads, SQL errors, request body, email, hashes or credentials.
  const diagnostic={stage,code};
  if(Number.isInteger(providerStatus)&&providerStatus>=100&&providerStatus<=599)diagnostic.providerStatus=providerStatus;
  return json({error:error instanceof Rejection?error.code:'unavailable',diagnostic},error instanceof Rejection?error.status:503);
 }
}
