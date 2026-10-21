// Read-only GetResponse observations. A snapshot is NOT a DOI timestamp or Founders grant.
import {json,readJson,hash,Rejection} from './forms.js';
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from './newsletter-test-policy.js';
import {authorisedNewsletterTestEmail} from './newsletter-test-allowlist.js';
import {verifyNewsletter} from './getresponse-newsletter.js';
import {inspectNewsletterContact} from './getresponse-controlled.js';
const api='https://api.getresponse.com/v3';
export async function observeNewsletter(request,env,{fetcher=fetch,now=new Date(),policy=resolveNewsletterTestPolicy(env)}={}){
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
  if(env.NEWSLETTER_OBSERVATIONS_ENABLED!=='true'||!policy.approved||!policy.version||!env.FORMS_DB||!env.GETRESPONSE_API_KEY||!/^[a-zA-Z0-9_-]{1,120}$/.test(env.GETRESPONSE_CAMPAIGN_ID||'')||typeof env.AUDIT_HASH_SECRET!=='string'||env.AUDIT_HASH_SECRET.length<32)return json({error:'unavailable'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  const raw=await readJson(request);
  if(!['before','after','unsubscribe'].includes(raw.phase)||typeof raw.email!=='string'||!await authorisedNewsletterTestEmail(env,raw.email))throw new Rejection('invalid');
  const email=raw.email.trim().toLowerCase(),subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+email);
  const recent=await env.FORMS_DB.prepare('SELECT COUNT(*) n FROM newsletter_observations WHERE subject_hash=? AND observed_at>?').bind(subject,new Date(now.getTime()-3600000).toISOString()).first();
  if(recent.n>=12)throw new Rejection('rate',429);
  const query=new URLSearchParams({'query[email]':email,'query[campaignId]':env.GETRESPONSE_CAMPAIGN_ID,perPage:'100'});
  // The provider's read-only search necessarily carries email server-to-server.
  // Never log this URL, response or API key. No browser query contains the email.
  await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetcher);
  const response=await fetcher(api+'/contacts?'+query,{headers:{'X-Auth-Token':'api-key '+env.GETRESPONSE_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Rejection('unavailable',503);
  const contacts=await response.json();if(!Array.isArray(contacts)||contacts.length>=100)throw new Rejection('unavailable',503);
  const matches=contacts.filter(c=>typeof c.email==='string'&&c.email.trim().toLowerCase()===email&&c.campaign?.campaignId===env.GETRESPONSE_CAMPAIGN_ID);
  if(matches.length>1)throw new Rejection('conflict',409);
  const contact=matches[0],check=contact?inspectNewsletterContact(contact,{email,campaignId:env.GETRESPONSE_CAMPAIGN_ID}):{customConsentStored:false};
  const date=value=>typeof value==='string'&&value.length<=80&&Number.isFinite(Date.parse(value))?value:null;
  const evidence={version:1,id:crypto.randomUUID(),phase:raw.phase,observedAt:now.toISOString(),campaignId:env.GETRESPONSE_CAMPAIGN_ID,matchingContactFound:Boolean(contact),contactId:typeof contact?.contactId==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(contact.contactId)?contact.contactId:null,customConsentStored:check.customConsentStored,providerCreatedOn:date(contact?.createdOn),providerChangedOn:date(contact?.changedOn),confirmationVerified:false,originalConfirmationAt:null,founders:'pending'};
  const requestRow=await env.FORMS_DB.prepare('SELECT request_id FROM newsletter_consent_requests WHERE subject_hash=? ORDER BY accepted_at DESC LIMIT 1').bind(subject).first();
  const text=JSON.stringify(evidence),mac=await hash(env.AUDIT_HASH_SECRET,'newsletter-observation-v1:'+text);
  await env.FORMS_DB.prepare('INSERT INTO newsletter_observations(id,request_id,subject_hash,phase,observed_at,evidence_json,evidence_mac) VALUES(?,?,?,?,?,?,?)').bind(evidence.id,requestRow?.request_id||null,subject,raw.phase,evidence.observedAt,text,mac).run();
  return json({ok:true,observation:evidence});
 }catch(error){return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);}
}
