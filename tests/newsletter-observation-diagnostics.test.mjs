import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {observeNewsletter} from '../server/newsletter-observations.js';
import {newsletterTestConfiguration} from '../functions/api/controlled/newsletter-config.js';
const path='/api/controlled/newsletter-observation';
function scenario(s,{campaign='valid',contacts='valid'}={}){
 const calls=[];
 const fetcher=async(target,options)=>{
  const url=new URL(target);assert.equal(url.origin,'https://api.getresponse.com');assert.ok(!options.method||options.method==='GET');assert.equal(options.redirect,'manual');calls.push({path:url.pathname});
  if(url.pathname==='/v3/campaigns/PL6jh'){
   if(campaign==='network')throw Error('PRIVATE CAMPAIGN URL AND KEY');
   if(Number.isInteger(campaign))return Response.json({private:s.env.GETRESPONSE_API_KEY},{status:campaign});
   if(campaign==='json')return new Response('PRIVATE malformed provider body');
   if(campaign==='identity')return Response.json({campaignId:'pl6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
   return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:campaign==='optin'?'single':'double'}});
  }
  assert.equal(url.pathname,'/v3/contacts');assert.equal(url.searchParams.get('query[email]'),s.data.email);assert.equal(url.searchParams.get('query[campaignId]'),'PL6jh');assert.equal(url.searchParams.get('perPage'),'100');
  if(contacts==='network')throw Error('PRIVATE QUERY EMAIL AND API KEY');
  if(Number.isInteger(contacts))return Response.json({private:s.data.email},{status:contacts});
  if(contacts==='json')return new Response('PRIVATE malformed contacts');
  if(contacts==='shape')return Response.json({contacts:[]});
  return Response.json([]);
 };
 return {fetcher,calls};
}
function run(s,fetcher,env=s.env){return observeNewsletter(s.request(path,{email:s.data.email,phase:'before'}),env,{policy,fetcher});}
function assertNoSubscriptions(s){for(const table of ['newsletter_consent_requests','newsletter_html_deliveries'])assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);}
function assertSanitised(body,s){const text=JSON.stringify(body);for(const secret of [s.data.email,s.env.GETRESPONSE_API_KEY,s.env.AUDIT_HASH_SECRET,s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET,s.env.NEWSLETTER_TEST_EMAIL_HASH,'PRIVATE','SELECT ','INSERT '])assert.ok(!text.includes(secret));}
test('PL6jh with documented GET filters and an empty contact list saves a before observation without consent, token or subscription',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s);try{
  const r=await run(s,mock.fetcher),body=await r.json();assert.equal(r.status,200);assert.equal(body.observation.matchingContactFound,false);assert.equal(body.observation.confirmationVerified,false);assert.equal(body.observation.originalConfirmationAt,null);assert.equal(body.observation.founders,'pending');assert.equal(mock.calls.length,2);
  const row=s.forms.sqlite.prepare('SELECT * FROM newsletter_observations').get();assert.equal(row.request_id,null);assert.equal(row.phase,'before');assertNoSubscriptions(s);
 }finally{s.close();}
});
test('PL6jh identity and API double opt-in remain strict; no case-folding or invented alternate contract',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';try{
  for(const [campaign,code] of [['identity','campaign_identity'],['optin','campaign_optin'],['json','campaign_response'],['network','campaign_network'],[401,'campaign_http'],[403,'campaign_http'],[404,'campaign_http'],[429,'campaign_http'],[500,'campaign_http']]){
   const mock=scenario(s,{campaign}),r=await run(s,mock.fetcher),body=await r.json();assert.equal(r.status,503);assert.equal(body.diagnostic.stage,'getresponse_campaign');assert.equal(body.diagnostic.code,code);assert.equal(mock.calls.length,1);if(Number.isInteger(campaign))assert.equal(body.diagnostic.providerStatus,campaign);assertSanitised(body,s);
  }
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,0);assertNoSubscriptions(s);
 }finally{s.close();}
});
test('contact lookup HTTP/network/payload errors have safe diagnostics and never fall back to a subscription call or retry',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';try{
  for(const [contacts,code] of [[400,'contacts_http'],[401,'contacts_http'],[403,'contacts_http'],[429,'contacts_http'],[500,'contacts_http'],['network','contacts_network'],['json','contacts_response'],['shape','contacts_response']]){
   const mock=scenario(s,{contacts}),r=await run(s,mock.fetcher),body=await r.json();assert.equal(r.status,503);assert.equal(body.diagnostic.stage,'getresponse_contacts');assert.equal(body.diagnostic.code,code);assert.equal(mock.calls.length,2);if(Number.isInteger(contacts))assert.equal(body.diagnostic.providerStatus,contacts);assertSanitised(body,s);
  }
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,0);assertNoSubscriptions(s);
 }finally{s.close();}
});
test('D1 read stages differ from provider failures without revealing schemas, SQL or exceptions',async()=>{
 for(const table of ['newsletter_observations','newsletter_consent_requests']){
  const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s);s.forms.sqlite.exec('DROP TABLE '+table);try{
   const r=await run(s,mock.fetcher),body=await r.json();assert.equal(r.status,503);assert.equal(body.diagnostic.stage,table==='newsletter_observations'?'storage_rate_read':'storage_consent_read');assert.equal(body.diagnostic.code,'storage_read');assert.equal(mock.calls.length,table==='newsletter_observations'?0:2);assertSanitised(body,s);
  }finally{s.close();}
 }
});
test('D1 write failures are identified without claiming that a lost response proves no write',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s),original=s.env.FORMS_DB;
 const db={prepare(sql){if(sql.startsWith('INSERT INTO newsletter_observations'))throw Error('PRIVATE SQL FAILURE '+s.data.email);return original.prepare(sql);}};
 try{const r=await run(s,mock.fetcher,{...s.env,FORMS_DB:db}),body=await r.json();assert.equal(r.status,503);assert.deepEqual(body.diagnostic,{stage:'storage_observation_write',code:'storage_write'});assert.equal(Object.hasOwn(body,'observationRecorded'),false);assertSanitised(body,s);assertNoSubscriptions(s);}finally{s.close();}
});
test('the config endpoint does not enable observation with malformed required configuration',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s);try{
  const changes=[{NEWSLETTER_OBSERVATIONS_ENABLED:'false'},{AUDIT_HASH_SECRET:'short'},{GETRESPONSE_CAMPAIGN_ID:' PL6jh '},{GETRESPONSE_API_KEY:''},{FORMS_DB:null},{NEWSLETTER_TEST_EMAIL_HASH:'not-a-hash'},{NEWSLETTER_TEST_ALLOWLIST_SECRET:'bad'}];
  for(const change of changes){const env={...s.env,...change};const request=new Request(s.env.REGISTRATION_ORIGIN+'/api/controlled/newsletter-config',{headers:{Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD)}});const config=await newsletterTestConfiguration(request,env,policy);assert.equal((await config.json()).observationsEnabled,false);const r=await run(s,mock.fetcher,env),body=await r.json();assert.equal(r.status,503);assert.equal(body.diagnostic.stage,'configuration');assertSanitised(body,s);}
  assert.equal(mock.calls.length,0);assertNoSubscriptions(s);
 }finally{s.close();}
});
test('allowlist mismatch is distinguishable after login, but never exposes the email, hash or secret',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s);try{
  const r=await observeNewsletter(s.request(path,{email:'other@example.test',phase:'before'}),s.env,{policy,fetcher:mock.fetcher}),body=await r.json();assert.equal(r.status,400);assert.deepEqual(body.diagnostic,{stage:'allowlist',code:'email_not_authorised'});assert.equal(mock.calls.length,0);assertSanitised(body,s);assertNoSubscriptions(s);
 }finally{s.close();}
});
test('unauthenticated requests cannot retrieve private observation diagnostics or reach providers',async()=>{
 const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';const mock=scenario(s);try{
  const r=await observeNewsletter(s.request(path,{email:s.data.email,phase:'before'},{Authorization:''}),s.env,{policy,fetcher:mock.fetcher});assert.equal(r.status,401);assert.ok(!(await r.text()).includes('diagnostic'));assert.equal(mock.calls.length,0);assertNoSubscriptions(s);
 }finally{s.close();}
});
