import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {observeNewsletter} from '../server/newsletter-observations.js';
import {hash} from '../server/forms.js';
import {controlledReview} from '../server/controlled-review.js';
import {handleRegistration,drainRegistrationMail,withdrawCareerConsent} from '../server/registrations.js';
import {inspectRegistrationAudit} from '../server/registration-audit.js';
import {legal} from '../server/settings.js';
const original=structuredClone(legal);afterEach(()=>Object.assign(legal,structuredClone(original)));
function approve(){Object.assign(legal,{approved:true,version:policy.version});}
test('API observations preserve only signed facts; no contact, custom value and creation date never grant DOI or Founders',async()=>{
 const s=await fixture();let contacts=[];const fetcher=async(url,options)=>{assert.ok(options.headers['X-Auth-Token']);if(url.includes('/campaigns/'))return Response.json({campaignId:s.env.GETRESPONSE_CAMPAIGN_ID,name:'cim_studio_newsletter',optinTypes:{api:'double'}});return Response.json(contacts);};
 try{
  let r=await observeNewsletter(s.request('/api/controlled/newsletter-observation',{email:s.data.email,phase:'before'}),s.env,{fetcher,policy});assert.equal(r.status,200);assert.equal((await r.json()).observation.matchingContactFound,false);
  contacts=[{contactId:'simulation-contact',email:s.data.email,campaign:{campaignId:s.env.GETRESPONSE_CAMPAIGN_ID},createdOn:'2026-10-20T09:00:00Z',changedOn:'2026-10-20T09:02:00Z',customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]}];
  r=await observeNewsletter(s.request('/api/controlled/newsletter-observation',{email:s.data.email,phase:'after'}),s.env,{fetcher,policy});const evidence=(await r.json()).observation;assert.equal(evidence.customConsentStored,true);assert.equal(evidence.confirmationVerified,false);assert.equal(evidence.originalConfirmationAt,null);assert.equal(evidence.founders,'pending');
  const rows=s.forms.sqlite.prepare('SELECT * FROM newsletter_observations').all();assert.equal(rows.length,2);
  for(const row of rows){assert.equal(await hash(s.env.AUDIT_HASH_SECRET,'newsletter-observation-v1:'+row.evidence_json),row.evidence_mac);assert.ok(!JSON.stringify(row).includes(s.data.email));}
 }finally{s.close();}
});
test('observations require approval, authentication, owner email, same origin and bounded provider reads',async()=>{
 const s=await fixture();let calls=0;const fetcher=async()=>{calls++;throw Error('simulation private error');};const body={email:s.data.email,phase:'before'};
 try{
  for(const change of [{NEWSLETTER_OBSERVATIONS_ENABLED:'false'},{CONTROLLED_TEST_MODE:'false'},{GETRESPONSE_API_KEY:''}])assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body),{...s.env,...change},{fetcher,policy})).status,503);
  assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body),s.env,{fetcher,policy:{...policy,approved:false}})).status,503);
  assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body,{Authorization:'wrong'}),s.env,{fetcher,policy})).status,401);
  assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body,{Origin:'https://attacker.test'}),s.env,{fetcher,policy})).status,403);
  assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',{...body,email:'other@example.test'}),s.env,{fetcher,policy})).status,400);assert.equal(calls,0);
  const r=await observeNewsletter(s.request('/api/controlled/newsletter-observation',body),s.env,{fetcher,policy});assert.equal(r.status,503);assert.ok(!(await r.text()).includes('simulation private error'));assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,0);
 }finally{s.close();}
});
test('samples with new request UUIDs but identical content do not repeat notifications',async()=>{
 const s=await fixture();approve();try{
  const sample={...s.sample,token:'sample-token'};
  assert.equal((await handleRegistration(s.request('/api/samples',sample),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher)).status,202);
  assert.equal((await handleRegistration(s.request('/api/samples',{...sample,requestId:crypto.randomUUID()}),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher)).status,202);
  assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,2);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
  assert.equal((await handleRegistration(s.request('/api/samples',{...sample,shippingAddress:'changed'}),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher)).status,409);
 }finally{s.close();}
});
test('simultaneous identical samples preserve a single claim and one pair of emails',async()=>{
 const s=await fixture();approve();try{
  const data={...s.sample,token:'sample-token'};
  const responses=await Promise.all([handleRegistration(s.request('/api/samples',data),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher),handleRegistration(s.request('/api/samples',{...data,requestId:crypto.randomUUID()}),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher)]);
  assert.ok(responses.every(r=>[202,409].includes(r.status)));assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,2);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
 }finally{s.close();}
});
test('registration evidence detects altered consent or event seals; existing unsealed history is not invented',async()=>{
 const s=await fixture();approve();try{
  await handleRegistration(s.request('/api/samples',{...s.sample,token:'sample-token'}),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher);
  let row=s.forms.sqlite.prepare('SELECT * FROM registrations').get();assert.equal((await inspectRegistrationAudit(s.forms.db,s.env,row)).verified,true);
  assert.equal((await inspectRegistrationAudit(s.forms.db,s.env,{...row,consent_text:'changed'})).verified,false);
  s.forms.sqlite.prepare("UPDATE registration_audit_seals SET evidence_mac='wrong'").run();assert.equal((await inspectRegistrationAudit(s.forms.db,s.env,row)).verified,false);
  s.forms.sqlite.prepare('DELETE FROM registration_audit_seals').run();assert.equal((await inspectRegistrationAudit(s.forms.db,s.env,row)).reason,'legacy_or_missing_seal');
 }finally{s.close();}
});
test('career confirmation and withdrawal produce sealed independent events without affecting newsletter',async()=>{
 const s=await fixture();approve();try{
  await handleRegistration(s.request('/api/careers',{...s.data,token:'career-token'}),{...s.env,CONTROLLED_TEST_MODE:'false'},'careers',s.fetcher);
  const mail=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body),token=mail.text.match(/preferences\/#([a-f0-9]{64})/)[1];
  await withdrawCareerConsent(s.request('/api/careers/unsubscribe',{token,action:'confirm'}),s.env,new Date(),null,s.fetcher);
  await withdrawCareerConsent(s.request('/api/careers/unsubscribe',{token,action:'unsubscribe'}),{...s.env,FORMS_ENABLED:'false',CAREERS_ENABLED:'false'});
  const row=s.careers.sqlite.prepare('SELECT * FROM registrations').get();assert.equal(row.encrypted_data,null);assert.equal((await inspectRegistrationAudit(s.careers.db,s.env,row)).events,3);
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
 }finally{s.close();}
});
test('Resend 429 retries are bounded, unknown responses are not resent and failed jobs retain reconciliation evidence',async()=>{
 const s=await fixture();approve();let attempts=0;const limited=async(url,options)=>url.includes('resend')?(attempts++,new Response(null,{status:429})):s.fetcher(url,options);
 try{
  const now=new Date('2026-10-20T09:00:00Z');await handleRegistration(s.request('/api/careers',{...s.data,token:'career-token'}),{...s.env,CONTROLLED_TEST_MODE:'false'},'careers',limited,now);
  for(let i=1;i<8;i++)await drainRegistrationMail(s.env,'careers',limited,new Date(now.getTime()+i*3600000));
  assert.equal(attempts,5);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'rejected');
 }finally{s.close();}
});
test('owner review is read-only, defaults blocked and requires private authentication/origin before decrypting one request',async()=>{
 const s=await fixture();approve();try{
  await handleRegistration(s.request('/api/samples',{...s.sample,token:'sample-token'}),{...s.env,CONTROLLED_TEST_MODE:'false'},'samples',s.fetcher);
  const id=s.forms.sqlite.prepare('SELECT id FROM registrations').get().id,body={kind:'samples',action:'record',id};
  assert.equal((await controlledReview(s.request('/api/controlled/review',body),{...s.env,CONTROLLED_REVIEW_ENABLED:'false'})).status,503);
  assert.equal((await controlledReview(s.request('/api/controlled/review',body,{Authorization:'wrong'}),s.env)).status,401);
  assert.equal((await controlledReview(s.request('/api/controlled/review',body,{Origin:'https://attacker.test'}),s.env)).status,403);
  const response=await controlledReview(s.request('/api/controlled/review',body),s.env),result=await response.json();assert.equal(response.status,200);assert.equal(result.record.data.shippingAddress,'Test street 1');assert.equal(result.audit.verified,true);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!JSON.stringify(result).includes(s.env.SAMPLES_DATA_KEY));assert.ok(!JSON.stringify(result).includes('unsubscribe_hash'));
  assert.equal((await controlledReview(s.request('/api/controlled/review',{kind:'samples',action:'delete',id}),s.env)).status,400);
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
 }finally{s.close();}
});

test('invalid Resend acknowledgements and corrupted pending ciphertext never produce a false delivery or blind retry',async()=>{
 const first=await fixture();approve();let sends=0;
 try{
  const invalid=async(url,options)=>url.includes('resend')?(sends++,Response.json({id:'invalid header\r\nsecret'})):first.fetcher(url,options);
  const response=await handleRegistration(first.request('/api/careers',{...first.data,token:'career-token'}),{...first.env,CONTROLLED_TEST_MODE:'false'},'careers',invalid);
  assert.equal(response.status,202);assert.equal((await response.json()).mail,'pending');assert.equal(first.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'unknown');
  await drainRegistrationMail(first.env,'careers',invalid);assert.equal(sends,1);
 }finally{first.close();}
 const second=await fixture();approve();let calls=0;
 try{
  const limited=async(url,options)=>url.includes('resend')?(calls++,new Response(null,{status:429})):second.fetcher(url,options),now=new Date('2026-10-20T10:00:00Z');
  await handleRegistration(second.request('/api/careers',{...second.data,token:'career-token'}),{...second.env,CONTROLLED_TEST_MODE:'false'},'careers',limited,now);
  second.careers.sqlite.prepare("UPDATE registration_mail SET encrypted_payload='tampered'").run();
  await drainRegistrationMail(second.env,'careers',limited,new Date(now.getTime()+61000));assert.equal(calls,1);assert.equal(second.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'unknown');
 }finally{second.close();}
});
test('observation failures and duplicate API matches remain unverified, and read limits prevent provider calls',async()=>{
 const s=await fixture();const body={email:s.data.email,phase:'after'};let calls=0;
 try{
  const fetcher=async(url)=>{calls++;if(url.includes('/campaigns/'))return Response.json({campaignId:s.env.GETRESPONSE_CAMPAIGN_ID,name:'cim_studio_newsletter',optinTypes:{api:'double'}});const contact={email:s.data.email,campaign:{campaignId:s.env.GETRESPONSE_CAMPAIGN_ID}};return Response.json([contact,contact]);};
  assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body),s.env,{policy,fetcher})).status,409);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,0);
  const subject=await hash(s.env.AUDIT_HASH_SECRET,'newsletter-consent:'+s.data.email),now=new Date();
  for(let i=0;i<12;i++)s.forms.sqlite.prepare('INSERT INTO newsletter_observations VALUES(?,?,?,?,?,?,?)').run('simulation-'+i,null,subject,'after',now.toISOString(),'{}','simulation-only');
  calls=0;assert.equal((await observeNewsletter(s.request('/api/controlled/newsletter-observation',body),s.env,{policy,fetcher,now})).status,429);assert.equal(calls,0);
 }finally{s.close();}
});
