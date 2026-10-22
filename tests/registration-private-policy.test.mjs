import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './helpers/launch-fixture.mjs';
import {registrationTestPolicies,resolveRegistrationTestPolicy,fictionalSample} from '../server/registration-test-policy.js';
import {registrationTestReady} from '../server/registration-test-scope.js';
import {registrationTestConfiguration} from '../functions/api/controlled/registration-config.js';
import {onRequest as samplesRoute} from '../functions/api/controlled/samples.js';
import {onRequest as careersRoute} from '../functions/api/controlled/careers.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import {handleRegistration,withdrawCareerConsent,drainRegistrationMail,decryptRegistration} from '../server/registrations.js';
import {inspectRegistrationAudit} from '../server/registration-audit.js';
import {legal,publicSettings} from '../server/settings.js';
const reviewed=kind=>({...registrationTestPolicies[kind],approved:true});
function configure(s){Object.assign(s.env,{SAMPLES_TEST_LEGAL_APPROVED:'true',CAREERS_TEST_LEGAL_APPROVED:'true',REGISTRATIONS_TEST_ENABLED:'true',SAMPLES_VERIFIED:'false',CAREERS_VERIFIED:'false',MAIL_RECEIPTS_VERIFIED:'false'});}
function data(s,kind,extra={}){return {...s.data,...(kind==='samples'?fictionalSample:{}),testData:true,legalVersion:registrationTestPolicies[kind].version,token:kind==='samples'?'sample-token':'career-token',...extra};}
function submit(s,kind,body=data(s,kind),env=s.env,policy=resolveRegistrationTestPolicy(env,kind,reviewed(kind)),headers={}){return handleRegistration(s.request('/api/controlled/'+kind,body,headers),env,kind,s.fetcher,new Date('2026-10-21T09:00:00Z'),policy);}
test('express sample and career approvals are separate, runtime-gated and cannot approve public documents',async()=>{
 const s=await fixture();configure(s);try{
  assert.equal(legal.approved,false);
  for(const kind of ['samples','careers']){
   const p=registrationTestPolicies[kind];assert.equal(p.approved,true);assert.match(p.version,/-private-test-v1$/);
   assert.equal(resolveRegistrationTestPolicy({},kind).approved,false);
   assert.equal(resolveRegistrationTestPolicy(s.env,kind,{...reviewed(kind),approved:false}).approved,false);
   assert.equal(resolveRegistrationTestPolicy(s.env,kind,reviewed(kind)).approved,true);
   assert.equal(resolveRegistrationTestPolicy(s.env,kind,{...reviewed(kind),version:'changed'}).approved,false);
   assert.equal(resolveRegistrationTestPolicy(s.env,kind,{...reviewed(kind),en:{consent:'',privacy:''}}).approved,false);
   const flag=(kind==='samples'?'SAMPLES':'CAREERS')+'_TEST_LEGAL_APPROVED';
   assert.equal(resolveRegistrationTestPolicy({...s.env,[flag]:'false'},kind,reviewed(kind)).approved,false);
   assert.equal(resolveRegistrationTestPolicy(s.env,kind,reviewed(kind==='samples'?'careers':'samples')).approved,false);
  }
  for(const route of [samplesRoute,careersRoute])assert.equal((await route({request:s.request('/api/controlled/samples',s.data),env:{...s.env,REGISTRATIONS_TEST_ENABLED:'false'}})).status,503);
  const publicConfig=publicSettings(s.env,new URL(s.env.REGISTRATION_ORIGIN));assert.equal(publicConfig.enabled.samples,false);assert.equal(publicConfig.enabled.careers,false);
  assert.equal((await handleRegistration(s.request('/api/samples',data(s,'samples')),s.env,'samples',s.fetcher)).status,503);
  assert.equal((await handleRegistration(s.request('/api/careers',data(s,'careers')),s.env,'careers',s.fetcher)).status,503);
  assert.equal(s.calls.length,0);
 }finally{s.close();}
});
test('private registration config and assets require exact test host and Basic; expose drafts, never secrets or authorised address',async()=>{
 const s=await fixture();configure(s);try{
  const request=(auth=true)=>new Request(s.env.REGISTRATION_ORIGIN+'/api/controlled/registration-config',{headers:auth?{Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD)}:{}});
  assert.equal((await registrationTestConfiguration(request(false),s.env)).status,401);
  const r=await registrationTestConfiguration(request(),{...s.env,REGISTRATIONS_TEST_ENABLED:'false'}),c=await r.json();assert.equal(c.enabled.samples,false);assert.equal(c.enabled.careers,false);assert.equal(c.siteKey,null);
  for(const v of [s.data.email,s.env.AUDIT_HASH_SECRET,s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET,s.env.NEWSLETTER_TEST_EMAIL_HASH,s.env.RESEND_API_KEY])assert.ok(!JSON.stringify(c).includes(v));
  for(const path of ['/controlled/registrations/','/controlled/registrations/test.js','/controlled%2Fregistrations/test.css','//controlled/registrations/test.js']){
   let calls=0;const next=async()=>{calls++;return new Response('never');};
   for(const env of [{...s.env,CONTROLLED_TEST_MODE:'false'},{...s.env,CONTROLLED_TEST_ORIGIN:'https://cimstudio.es'}])assert.equal((await middleware({request:s.request(path,{}),env,next})).status,503);
   assert.equal((await middleware({request:s.request(path,{}, {Authorization:''}),env:s.env,next})).status,401);assert.equal(calls,0);
  }
 }finally{s.close();}
});
test('private test has fail-closed independent gates, unchanged audit key and no writes/sends on blocked requests',async()=>{
 const s=await fixture();configure(s);const audit=s.env.AUDIT_HASH_SECRET;try{
  for(const kind of ['samples','careers']){
   const own=(kind==='samples'?'SAMPLES':'CAREERS');
   for(const change of [{[own+'_TEST_LEGAL_APPROVED']:'false'},{CONTROLLED_TEST_MODE:'false'},{SITE_LIVE:'true'},{REGISTRATIONS_TEST_ENABLED:'false'},{FORMS_ENABLED:'false'},{[own+'_ENABLED']:'false'},{REGISTRATIONS_STORAGE_REVIEWED:'false'},{NEWSLETTER_TEST_ALLOWLIST_SECRET:''},{NEWSLETTER_TEST_ALLOWLIST_SECRET:btoa('x'.repeat(32))},{CAREERS_DB:s.env.FORMS_DB}])assert.ok((await submit(s,kind,undefined,{...s.env,...change})).status>=400,JSON.stringify(Object.keys(change)));
   assert.equal((await submit(s,kind,undefined,s.env,undefined,{Authorization:'wrong'})).status,401);
   assert.equal((await submit(s,kind,undefined,s.env,undefined,{Origin:'https://attacker.example.test'})).status,403);
   assert.equal((await submit(s,kind,data(s,kind,{email:'other@example.test'}))).status,503);
  }
  assert.equal(s.calls.length,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(s.env.AUDIT_HASH_SECRET,audit);
 }finally{s.close();}
});
test('private consent must be explicit, current and accompanied by fictional-data acknowledgement',async()=>{
 const s=await fixture();configure(s);try{
  for(const kind of ['samples','careers'])for(const extra of [{consent:false},{testData:false},{testData:undefined},{legalVersion:'public-policy'},{website:'spam'}])assert.equal((await submit(s,kind,data(s,kind,extra))).status,400);
  for(const field of Object.keys(fictionalSample))assert.equal((await submit(s,'samples',data(s,'samples',{[field]:'Real third-party information'}))).status,400);
  assert.equal(s.calls.length,0);
 }finally{s.close();}
});
test('private samples retain exactly the accepted test notice evidence and fictional fields, separate from careers/newsletter',async()=>{
 const s=await fixture();configure(s);try{
  const body=data(s,'samples');assert.equal((await submit(s,'samples',body)).status,202);
  const row=s.forms.sqlite.prepare('SELECT * FROM registrations').get();assert.equal(row.consent_version,registrationTestPolicies.samples.version);assert.equal(row.consent_text,registrationTestPolicies.samples.es.consent);assert.equal(row.consent_at,'2026-10-21T09:00:00.000Z');assert.equal((await inspectRegistrationAudit(s.forms.db,s.env,row)).verified,true);
  const clear=await decryptRegistration(s.env,'samples',row.id,row.encrypted_data);assert.deepEqual(clear,{version:2,email:s.data.email,...fictionalSample});
  assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
  assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,2);assert.ok(!JSON.stringify(row).includes(s.data.email));
  assert.equal((await submit(s,'samples',{...body,requestId:crypto.randomUUID()})).status,202);assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,2);
  assert.deepEqual(await drainRegistrationMail(s.env,'samples',s.fetcher,new Date(),null,resolveRegistrationTestPolicy(s.env,'samples',reviewed('samples'))),{accepted:0,pending:0,review:0});
 }finally{s.close();}
});
test('private careers confirm and withdraw with exact owner email, private capability link and signed independent history',async()=>{
 const s=await fixture();configure(s);try{
  const body=data(s,'careers',{language:'en'});assert.equal((await submit(s,'careers',body)).status,202);
  const mail=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body),token=mail.text.match(/controlled\/registrations\/#([a-f0-9]{64})/)[1];
  const policy=resolveRegistrationTestPolicy(s.env,'careers',reviewed('careers'));
  const action=(extra={},headers={})=>s.request('/api/controlled/career-preferences',{token,email:s.data.email,testData:true,action:'confirm',...extra},headers);
  assert.equal((await withdrawCareerConsent(action({email:'other@example.test'}),s.env,new Date(),policy)).status,503);
  assert.equal((await withdrawCareerConsent(action({}, {Authorization:''}),s.env,new Date(),policy)).status,401);
  const id=s.careers.sqlite.prepare('SELECT id FROM registrations').get().id;
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');
  assert.equal((await withdrawCareerConsent(action(),s.env,new Date(),policy,s.fetcher)).status,200);
  const admin=s.calls.filter(c=>c.url.includes('resend')).map(c=>JSON.parse(c.options.body)).filter(m=>m.to.includes('admin@cimstudio.es'));assert.equal(admin.length,1);assert.ok(!admin[0].text.includes(token));
  assert.equal((await withdrawCareerConsent(action({action:'unsubscribe'}),s.env,new Date(),policy)).status,200);
  const row=s.careers.sqlite.prepare('SELECT * FROM registrations').get();assert.equal(row.id,id);assert.equal(row.state,'withdrawn');assert.equal(row.encrypted_data,null);assert.equal(row.consent_text,registrationTestPolicies.careers.en.consent);assert.equal((await inspectRegistrationAudit(s.careers.db,s.env,row)).events,3);
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
 }finally{s.close();}
});
test('private HTML starts disabled with both acknowledgements required and unchecked, no external scripts or public endpoint',()=>{
 const html=readFileSync('controlled/registrations/index.html','utf8'),js=readFileSync('controlled/registrations/test.js','utf8');assert.match(html,/<fieldset disabled>/);
 for(const name of ['consent','testData']){const checkbox=html.match(new RegExp('<input[^>]*name="'+name+'"[^>]*>'))[0];assert.match(checkbox,/required/);assert.ok(!/checked/.test(checkbox));}
 assert.ok(!html.includes('challenges.cloudflare.com'));assert.ok(!js.includes("fetch('/api/samples'"));assert.ok(!js.includes("fetch('/api/careers'"));assert.match(js,/history.replaceState/);
});
test('private challenge failures cannot create records and prior approval evidence cannot be relabelled as trial consent',async()=>{
 const s=await fixture();configure(s);try{
  const body=data(s,'careers'),p=resolveRegistrationTestPolicy(s.env,'careers',reviewed('careers'));
  const bad=await handleRegistration(s.request('/api/controlled/careers',body),s.env,'careers',async()=>Response.json({success:true,hostname:'other.example.test',action:'careers'}),new Date(),p);assert.equal(bad.status,403);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
  assert.equal((await submit(s,'careers',body)).status,202);
  s.careers.sqlite.prepare("UPDATE registrations SET consent_version='previous-other-scope'").run();const calls=s.calls.length;
  assert.equal((await submit(s,'careers',body)).status,409);assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,1);assert.equal(s.calls.length,calls+1);
  assert.equal(s.careers.sqlite.prepare('SELECT consent_version FROM registrations').get().consent_version,'previous-other-scope');
 }finally{s.close();}
});
test('consolidated document reproduces exact approved private texts without approving public documents',async()=>{
 const {newsletterTestPolicy}=await import('../server/newsletter-test-policy.js');
 const text=readFileSync('PRIVATE-TEST-NOTICES.md','utf8');
 for(const p of [newsletterTestPolicy,...Object.values(registrationTestPolicies)]){assert.equal(p.approved,true);assert.ok(text.includes('`'+p.version+'`'));for(const lang of ['es','en'])for(const field of ['consent','privacy'])assert.ok(text.includes(p[lang][field]));
  for(const lang of ['es','en']){assert.match(p[lang].privacy,lang==='es'?/confirmados por CIM Studio/:/confirmed by CIM Studio/);assert.match(p[lang].privacy,/Carrer Joan Sindic, 7/);assert.ok(!p[lang].privacy.includes('Juan Sindic'));assert.match(p[lang].privacy,lang==='es'?/bajo la supervisión de su responsable/:/under the supervision of its responsible representative/);}}
 assert.equal(legal.approved,false);
});

test('career capability page requires Basic only in controlled mode; public page has no login challenge',async()=>{
 const s=await fixture();configure(s);try{
  let reached=0;const next=async()=>{reached++;return new Response('simulation capability page');};
  const privatePage=new Request(s.env.REGISTRATION_ORIGIN+'/controlled/registrations/');
  const denied=await middleware({request:privatePage,env:s.env,next});assert.equal(denied.status,401);assert.match(denied.headers.get('WWW-Authenticate'),/^Basic/);assert.equal(reached,0);
  const authorised=new Request(privatePage,{headers:{Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD)}});
  assert.equal((await middleware({request:authorised,env:s.env,next})).status,200);
  const publicPage=new Request('https://cimstudio.es/careers/preferences/');
  const allowed=await middleware({request:publicPage,env:{...s.env,CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:'https://cimstudio.es'},next});
  assert.equal(allowed.status,200);assert.equal(allowed.headers.get('WWW-Authenticate'),null);
  const privateOnPublic=await middleware({request:new Request('https://cimstudio.es/controlled/registrations/'),env:{...s.env,CONTROLLED_TEST_MODE:'false'},next});assert.equal(privateOnPublic.status,503);
 }finally{s.close();}
});
