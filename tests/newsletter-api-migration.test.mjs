import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {handleControlledNewsletter,controlledNewsletterReady} from '../server/getresponse-controlled-handler.js';
import {recordControlledConsent,verifyConsentEvidence} from '../server/getresponse-controlled.js';
import {prepareNewsletterApi} from '../server/getresponse-api-submission.js';
async function setup(){
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true'});
 const calls=[],mock={status:202,optin:'double',contacts:[],throw:false};
 const fetcher=async(url,options)=>{calls.push({url,options});assert.equal(options.redirect,'manual');
 if(url.includes('siteverify'))return s.fetcher(url,options);
 assert.equal(options.headers['X-Auth-Token'],'api-key '+s.env.GETRESPONSE_API_KEY);
 if(url.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:mock.optin}});
 if(url.includes('/contacts?'))return Response.json(mock.contacts);
 assert.equal(url,'https://api.getresponse.com/v3/contacts');assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'application/json');
 assert.deepEqual(JSON.parse(options.body),{email:s.data.email,campaign:{campaignId:'PL6jh'},customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]});
 assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries WHERE request_id=?').get(s.data.requestId).state,'sending');assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_api_deliveries').get().state,'sending');
 assert.ok(await verifyConsentEvidence(s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get(),s.env.AUDIT_HASH_SECRET));
 if(mock.throw)throw new DOMException('PRIVATE provider timeout','TimeoutError');return new Response('PRIVATE PROVIDER BODY',{status:mock.status,headers:{Location:'https://must-not-follow.example.test'}});
 };
 return {...s,calls,mock,run:(change={},env=s.env)=>handleControlledNewsletter(s.request('/api/controlled/subscribe',{...s.data,...change}),env,{policy,fetcher}),posts:()=>calls.filter(c=>c.url==='https://api.getresponse.com/v3/contacts')};
}
test('API transport is blocked by default and requires separately reviewed DOI and exact destination',async()=>{
 const s=await setup();try{
 for(const changes of [{NEWSLETTER_API_REVIEWED:undefined},{NEWSLETTER_API_REVIEWED:'false'},{GETRESPONSE_CAMPAIGN_ID:'other'},{GETRESPONSE_API_KEY:''}]){const env={...s.env,...changes};assert.equal(controlledNewsletterReady(env,policy),false);assert.equal((await s.run({},env)).status,503);}
 assert.equal(s.calls.length,0);
 assert.throws(()=>prepareNewsletterApi({...s.env,GETRESPONSE_API_KEY:'bad\r\nkey'},s.data.email));
 }finally{s.close();}
});
test('API 202 persists acceptance separately from DOI and replays idempotently without a second POST',async()=>{
 const s=await setup();try{
 const r=await s.run(),body=await r.json();assert.equal(r.status,202);assert.equal(body.delivery,'accepted');assert.equal(body.subscription,'request_accepted');assert.equal(body.confirmationVerified,false);assert.equal(body.founders,'pending');
 assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_api_deliveries').get().state,'accepted');assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'unverified');
 for(const change of [{},{requestId:crypto.randomUUID()}]){const repeated=await s.run(change);assert.equal(repeated.status,202);assert.deepEqual(await repeated.json(),body);}assert.equal(s.posts().length,1);
 assert.ok(!JSON.stringify(body).includes(s.data.email));
 }finally{s.close();}
});
test('API rejection, conflict, redirects, unexpected successes, 5xx and timeout never cause fallback or resubmission',async()=>{
 for(const status of [400,401,403,404,422,429,409,200,201,301,302,303,307,308,500,503,'timeout']){
 const s=await setup();try{
 if(status==='timeout')s.mock.throw=true;else s.mock.status=status;
 const r=await s.run(),body=await r.json(),rejected=[400,401,403,404,422,429].includes(status);
 assert.equal(r.status,rejected?502:409);assert.equal(body.delivery,rejected?'rejected':'uncertain');assert.equal(body.founders,'pending');
 assert.ok(!JSON.stringify(body).includes('PRIVATE'));assert.equal(s.posts().length,1);
 await s.run({requestId:crypto.randomUUID()});assert.equal(s.posts().length,1);assert.ok(!s.calls.some(c=>c.url.includes('add_subscriber')));
 assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_api_deliveries').get().state,rejected?'rejected':'unknown');
 }finally{s.close();}}
});
test('historical HTML rejection and signed evidence remain intact and block a new API attempt',async()=>{
 const s=await setup();try{
 await recordControlledConsent(s.env,s.data,new Date('2026-10-21T09:00:00Z'),policy);
 const evidence=s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get();
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(s.data.requestId,evidence.subject_hash,'2026-10-21T09:00:00Z','2026-10-21T09:00:00Z',0);
 const before=s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get();
 const r=await s.run({requestId:crypto.randomUUID()}),body=await r.json();assert.equal(r.status,502);assert.equal(body.diagnostic.stage,'getresponse_html');assert.equal(body.diagnostic.providerStatus,404);assert.equal(s.posts().length,0);
 assert.ok(s.calls.every(c=>c.url.includes('siteverify')));assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get(),before);assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get(),evidence);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_api_deliveries').get().n,0);
 }finally{s.close();}
});
test('single opt-in, existing contacts, malformed lookup and missing API schema prevent all API writes',async()=>{
 for(const mode of ['single','existing','malformed','schema']){const s=await setup();try{
 if(mode==='single')s.mock.optin='single';if(mode==='existing')s.mock.contacts=[{email:s.data.email,campaign:{campaignId:'PL6jh'}}];if(mode==='malformed')s.mock.contacts={};if(mode==='schema')s.forms.sqlite.exec('DROP TABLE newsletter_api_deliveries');
 assert.notEqual((await s.run()).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,0);
 }finally{s.close();}}
});
test('concurrent API requests claim one delivery and never create two contacts',async()=>{
 const s=await setup();try{const responses=await Promise.all([s.run(),s.run()]);assert.ok(responses.every(r=>[202,409].includes(r.status)));assert.equal(s.posts().length,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_api_deliveries').get().n,1);}finally{s.close();}
});
test('failed persistence after provider acceptance remains uncertain and permanently blocks automatic retries',async()=>{
 const s=await setup();try{
 const prepare=s.env.FORMS_DB.prepare.bind(s.env.FORMS_DB);s.env.FORMS_DB.prepare=sql=>{if(sql.startsWith('UPDATE newsletter_api_deliveries SET state=?'))throw Error('SIMULATED D1 failure');return prepare(sql);};
 const r=await s.run();assert.notEqual(r.status,202);assert.equal(s.posts().length,1);await s.run({requestId:crypto.randomUUID()});assert.equal(s.posts().length,1);assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'unknown');
 }finally{s.close();}
});
test('API sidecar migration is additive and repeatable without changing the HTML ledger or consent evidence',async()=>{
 const {readFileSync}=await import('node:fs');const s=await setup();try{
 await recordControlledConsent(s.env,s.data,new Date('2026-10-21T09:00:00Z'),policy);
 const evidence=s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get();
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(s.data.requestId,evidence.subject_hash,'2026-10-21T09:00:00Z','2026-10-21T09:00:00Z',0);
 const before=s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get(),sql=readFileSync('migrations/0009_newsletter_api_deliveries.sql','utf8');
 s.forms.sqlite.exec(sql);s.forms.sqlite.exec(sql);assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get(),before);assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get(),evidence);assert.equal(s.forms.sqlite.prepare('PRAGMA quick_check').get().quick_check,'ok');assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_api_deliveries').get().n,0);
 }finally{s.close();}
});

test('normal new-owner signup ignores an invalid retry parent and expired historical permission without changing either',async()=>{
 const s=await setup();try{
 const oldId=crypto.randomUUID(),old={...s.data,requestId:oldId,email:'previous-owner@example.test'};
 const {evidence}=await recordControlledConsent(s.env,old,new Date('2026-10-21T09:00:00Z'),policy);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,0)").run(oldId,evidence.subject_hash,'2026-10-21T09:00:00Z','2026-10-21T09:00:00Z');
 s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits VALUES(?,?,?,?,?,?,1,NULL)').run(oldId,crypto.randomUUID(),evidence.subject_hash,1,600,'CIM Studio simulation');
 Object.assign(s.env,{NEWSLETTER_HTML404_RETRY_ENABLED:'false',NEWSLETTER_HTML404_RETRY_PARENT_ID:'invalid historical configuration'});
 const r=await s.run();assert.equal(r.status,202);assert.equal(s.posts().length,1);assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries WHERE request_id=?').get(oldId).state,'rejected');assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_retry_attempts').get().n,0);
 }finally{s.close();}
});
