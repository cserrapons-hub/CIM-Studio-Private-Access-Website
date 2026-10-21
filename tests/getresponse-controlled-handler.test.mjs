import test from 'node:test';
import {newsletterTestPolicy} from '../server/newsletter-test-policy.js';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {recordControlledConsent,verifyConsentEvidence} from '../server/getresponse-controlled.js';
import {hash} from '../server/forms.js';
import {newsletterTestEmailHash} from '../server/newsletter-test-allowlist.js';
import {onRequest as controlledRoute} from '../functions/api/controlled/subscribe.js';
import {onRequest as publicRoute} from '../functions/api/subscribe.js';
const policy={...newsletterTestPolicy,approved:true,version:'simulation-policy-v1'};
async function setup(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_forms.sql','0006_newsletter_consent.sql','0007_newsletter_html_deliveries.sql','0009_newsletter_api_deliveries.sql'])sqlite.exec(readFileSync('migrations/'+name,'utf8'));
 const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};}};
 const env={NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_API_KEY:'simulation-api-key',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_TEST_LEGAL_APPROVED:'true',CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:'https://cim-studio-test.pages.dev',CONTROLLED_TEST_USER:'test-owner',CONTROLLED_TEST_PASSWORD:'test-only-password-at-least-32-characters',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true',FORMS_DB:db,AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-characters',NEWSLETTER_DATA_KEY:btoa('n'.repeat(32)),NEWSLETTER_TEST_ALLOWLIST_SECRET:btoa('l'.repeat(32)),TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret',SITE_LIVE:'false'};
 const data={email:'owner@example.test',consent:true,language:'es',requestId:crypto.randomUUID(),legalVersion:policy.version,token:'simulation-token',website:''};
 env.NEWSLETTER_TEST_EMAIL_HASH=await newsletterTestEmailHash(env.NEWSLETTER_TEST_ALLOWLIST_SECRET,data.email);
 const headers={Origin:env.CONTROLLED_TEST_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD)};
 const request=(change={},h={})=>new Request(env.CONTROLLED_TEST_ORIGIN+'/api/controlled/subscribe',{method:'POST',headers:{...headers,...h},body:JSON.stringify({...data,...change})});
 const calls=[],mock={status:302,challenge:{success:true,hostname:'cim-studio-test.pages.dev',action:'subscribe'},challengeStatus:200,throwProvider:false};
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return Response.json(mock.challenge,{status:mock.challengeStatus});
  if(url==='https://api.getresponse.com/v3/campaigns/PL6jh')return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
  if(url.startsWith('https://api.getresponse.com/v3/contacts?'))return Response.json([]);
  assert.equal(url,'https://api.getresponse.com/v3/contacts');
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM newsletter_html_deliveries WHERE state='sending'").get().n,1);
  if(mock.throwProvider)throw Error('SIMULATED provider uncertainty; not for logging');
  return new Response('PRIVATE PROVIDER BODY owner@example.test',{status:mock.status,headers:{Location:'https://untrusted.example.test/?email=owner@example.test','Set-Cookie':'private=test'}});
 };
 const run=(r=request(),changes={})=>handleControlledNewsletter(r,env,{fetcher,policy,now:()=>new Date('2026-10-20T12:00:00Z'),...changes});
 return {sqlite,env,data,request,run,calls,mock,fetcher};
}
test('controlled route and public route cannot send with default configuration or unapproved legal text',async()=>{
 const s=await setup();try{
  for(const changes of [{NEWSLETTER_CONTROLLED_SEND_ENABLED:'false'},{NEWSLETTER_PREPARATION_ENABLED:'false'},{CONTROLLED_TEST_MODE:'false'},{SITE_LIVE:'true'},{NEWSLETTER_TEST_EMAIL_HASH:''},{NEWSLETTER_DATA_KEY:'bad'}]){
   const response=await handleControlledNewsletter(s.request(),{...s.env,...changes},{fetcher:s.fetcher,policy});assert.equal(response.status,503);
  }
  assert.equal((await s.run(s.request(),{policy:{...policy,approved:false}})).status,503);
  assert.equal((await controlledRoute({request:s.request(),env:{...s.env,NEWSLETTER_CONTROLLED_SEND_ENABLED:'false'}})).status,503);
  assert.equal((await publicRoute({request:s.request(),env:s.env})).status,503);
  assert.equal(s.calls.length,0);
 }finally{s.sqlite.close();}
});
test('Basic authentication, exact HTTPS origin, same origin and approved owner email are mandatory',async()=>{
 const s=await setup();try{
  assert.equal((await s.run(s.request({},{Authorization:'Basic '+btoa('wrong:wrong')}))).status,401);
  assert.equal((await s.run(s.request({},{Origin:'https://attacker.example.test'}))).status,403);
  assert.equal((await s.run(s.request({},{'Sec-Fetch-Site':'cross-site'}))).status,403);
  const alias=new Request('https://alias.example.test/api/controlled/subscribe',{method:'POST',headers:Object.fromEntries(s.request().headers),body:JSON.stringify(s.data)});
  assert.equal((await s.run(alias)).status,403);
  assert.equal((await s.run(s.request({email:'someone-else@example.test'}))).status,503);
  assert.equal(s.calls.length,0);
 }finally{s.sqlite.close();}
});
test('validate consent, email, legal version, honeypot, request ID and bounded JSON before provider calls',async()=>{
 const s=await setup();try{
  for(const change of [{consent:false},{email:'invalid'},{legalVersion:'old'},{website:'bot'},{requestId:'invalid'},{token:''},{language:'fr'}])assert.equal((await s.run(s.request(change))).status,400);
  assert.equal((await s.run(s.request({},{'Content-Type':'text/plain'}))).status,415);
  assert.equal((await s.run(s.request({extra:'x'.repeat(17000)}))).status,413);
  assert.equal(s.calls.length,0);
 }finally{s.sqlite.close();}
});
test('Turnstile is verified server-side with exact hostname/action and fails closed',async()=>{
 for(const proof of [{success:false},{success:true,hostname:'other.test',action:'subscribe'},{success:true,hostname:'cim-studio-test.pages.dev',action:'samples'}]){
  const s=await setup();try{s.mock.challenge=proof;assert.equal((await s.run()).status,403);assert.equal(s.calls.length,1);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);}finally{s.sqlite.close();}
 }
 const s=await setup();try{s.mock.challengeStatus=503;assert.equal((await s.run()).status,503);assert.equal(s.calls.length,1);}finally{s.sqlite.close();}
});
test('relay stores encrypted signed evidence before sending only supported fields, never follows or exposes redirects',async()=>{
 const s=await setup();try{
  const response=await s.run();assert.equal(response.status,409);assert.equal((await response.json()).subscription,'pending_provider_verification');
  assert.equal(response.headers.get('Location'),null);assert.equal(response.headers.get('Set-Cookie'),null);
  const provider=s.calls.find(x=>x.url==='https://api.getresponse.com/v3/contacts');assert.equal(provider.options.redirect,'manual');assert.ok(provider.options.signal);
  assert.deepEqual(JSON.parse(provider.options.body),{email:'owner@example.test',campaign:{campaignId:'PL6jh'},customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]});assert.equal(provider.options.headers['X-Auth-Token'],'api-key simulation-api-key');
  const record=s.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get();assert.ok(await verifyConsentEvidence(record,s.env.AUDIT_HASH_SECRET));assert.ok(!JSON.stringify(record).includes(s.data.email));
  const delivery=s.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get();assert.equal(delivery.state,'unverified');assert.equal(delivery.provider_http_status,302);assert.ok(!JSON.stringify(delivery).includes(s.data.email));
 }finally{s.sqlite.close();}
});
test('repeated IDs and fresh IDs for same email never trigger a second provider request; conflicting ID rejected',async()=>{
 const s=await setup();try{
  await s.run();assert.equal((await s.run()).status,409);assert.equal((await s.run(s.request({requestId:crypto.randomUUID()}))).status,409);
  assert.equal((await s.run(s.request({language:'en'}))).status,409);
  assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,1);
 }finally{s.sqlite.close();}
});
test('concurrent submissions claim exactly one durable delivery',async()=>{
 const s=await setup();try{
  const responses=await Promise.all([s.run(),s.run()]);assert.deepEqual(responses.map(r=>r.status),[409,409]);assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);
 }finally{s.sqlite.close();}
});
test('timeouts and server errors remain unknown and cannot be automatically resent',async()=>{
 for(const mode of ['timeout','server']){
  const s=await setup();try{
   if(mode==='timeout')s.mock.throwProvider=true;else s.mock.status=503;
   assert.equal((await s.run()).status,409);assert.equal(s.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'unknown');
   await s.run(s.request({requestId:crypto.randomUUID()}));assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);
  }finally{s.sqlite.close();}
 }
});
test('provider rejection is generic, not a confirmation, and does not leak provider content',async()=>{
 for(const status of [400,401,403,404,405,413,415,422,429]){
  const s=await setup();try{s.mock.status=status;const response=await s.run();assert.equal(response.status,502);const text=await response.text();assert.ok(!text.includes(s.data.email));assert.ok(!text.includes('PRIVATE'));assert.ok(!text.includes('confirmation_required'));assert.equal(s.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'rejected');}finally{s.sqlite.close();}
 }
});
test('unexpected HTTP 200 or 201 is not API acceptance or confirmation',async()=>{
 for(const status of [200,201]){
  const s=await setup();try{s.mock.status=status;const response=await s.run();assert.equal(response.status,409);assert.equal((await response.json()).founders,'pending');assert.equal(s.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'unverified');}finally{s.sqlite.close();}
 }
});
test('per-IP and global limits stop abusive requests before calling Turnstile or GetResponse',async()=>{
 const s=await setup();try{
  for(let i=0;i<5;i++)await s.run();const before=s.calls.length;
  assert.equal((await s.run()).status,429);assert.equal(s.calls.length,before);
 }finally{s.sqlite.close();}
 const t=await setup();try{
  for(let i=0;i<20;i++)await t.run(t.request({},{'CF-Connecting-IP':'192.0.2.'+(i+1)}));const before=t.calls.length;
  assert.equal((await t.run(t.request({},{'CF-Connecting-IP':'192.0.2.250'}))).status,429);assert.equal(t.calls.length,before);
 }finally{t.sqlite.close();}
});
test('database failure cannot send data; expired sends require reconciliation, not lease retries',async()=>{
 const s=await setup();try{
  const missing={prepare(){throw Error('SIMULATED database failure');}};
  assert.equal((await handleControlledNewsletter(s.request(),{...s.env,FORMS_DB:missing},{fetcher:s.fetcher,policy})).status,503);assert.equal(s.calls.length,0);
  await s.run();s.sqlite.prepare("UPDATE newsletter_html_deliveries SET state='sending',lease_until=0").run();await s.run();assert.equal(s.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'unknown');assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);
 }finally{s.sqlite.close();}
});

test('independent allowlist secret is mandatory; wrong key and legacy audit-derived hash cannot authorise or send',async()=>{
 for(const mode of ['missing','malformed','wrong','legacy','reused']){
  const s=await setup();try{
   if(mode==='missing')delete s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET;
   if(mode==='malformed')s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET='not-a-base64-key';
   if(mode==='wrong')s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET=btoa('w'.repeat(32));
   if(mode==='legacy')s.env.NEWSLETTER_TEST_EMAIL_HASH=await hash(s.env.AUDIT_HASH_SECRET,'newsletter-consent:'+s.data.email);
   if(mode==='reused')s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET=s.env.AUDIT_HASH_SECRET;
   assert.equal((await s.run()).status,503,mode);assert.equal(s.calls.length,0,mode);
   assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
   assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,0);
  }finally{s.sqlite.close();}
 }
});
test('existing signed evidence, audit-derived subjects and deduplication survive independent allowlist rotation',async()=>{
 const s=await setup();try{
  // Evidence helper has no dependency on the allowlist, just as before this change.
  const legacyEnv={...s.env};delete legacyEnv.NEWSLETTER_TEST_ALLOWLIST_SECRET;
  const original=await recordControlledConsent(legacyEnv,s.data,new Date('2026-10-19T10:00:00Z'),policy);
  assert.ok(await verifyConsentEvidence(original.evidence,s.env.AUDIT_HASH_SECRET));
  await s.run();
  const subject=await hash(s.env.AUDIT_HASH_SECRET,'newsletter-consent:'+s.data.email);
  assert.equal(s.sqlite.prepare('SELECT subject_hash FROM newsletter_html_deliveries').get().subject_hash,subject);
  const rateId=await hash(s.env.AUDIT_HASH_SECRET,'controlled-newsletter-rate:ip:192.0.2.1:'+Math.floor(new Date('2026-10-20T12:00:00Z').getTime()/3600000));
  assert.equal(s.sqlite.prepare('SELECT count FROM form_rate_limits WHERE id=?').get(rateId).count,1);
  s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET=btoa('r'.repeat(32));
  s.env.NEWSLETTER_TEST_EMAIL_HASH=await newsletterTestEmailHash(s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET,s.data.email);
  await s.run();
  const stored=s.sqlite.prepare('SELECT * FROM newsletter_consent_requests').get();assert.deepEqual(stored,original.evidence);
  assert.ok(await verifyConsentEvidence(stored,s.env.AUDIT_HASH_SECRET));
  assert.equal(await verifyConsentEvidence(stored,s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET),false);
  assert.equal(s.sqlite.prepare('SELECT count FROM form_rate_limits WHERE id=?').get(rateId).count,2);
  assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);
 }finally{s.sqlite.close();}
});

test('Turnstile transport is Workers-compatible and rejects redirects before consent or HTML delivery',async()=>{
 for(const status of [301,302,303,307,308]){
  const s=await setup();try{let calls=0;const response=await s.run(s.request(),{fetcher:async(url,options)=>{calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.redirect,'manual');assert.equal(options.method,'POST');return new Response(null,{status,headers:{Location:'https://untrusted.example.test'}});}});assert.equal(response.status,503);assert.equal(calls,1);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,0);}finally{s.sqlite.close();}
 }
});

test('a persisted API 404 is an explicit rejection and remains blocked across request IDs',async()=>{
 const s=await setup();try{
 s.mock.status=404;const first=await s.run();const body=await first.json();assert.equal(first.status,502);assert.equal(body.error,'provider_rejected');assert.equal(body.delivery,'rejected');assert.equal(body.diagnostic.providerStatus,404);assert.equal(body.founders,'pending');
 for(const change of [{},{requestId:crypto.randomUUID()}]){const r=await s.run(s.request(change));assert.equal(r.status,502);assert.deepEqual(await r.json(),body);}
 assert.equal(s.calls.filter(x=>x.url==='https://api.getresponse.com/v3/contacts').length,1);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,1);assert.equal(s.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'rejected');
 }finally{s.sqlite.close();}
});
