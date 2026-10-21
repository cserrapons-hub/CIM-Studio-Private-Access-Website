import test from 'node:test';
import {newsletterTestPolicy} from '../server/newsletter-test-policy.js';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {prepareControlledHtml,recordControlledConsent,verifyConsentEvidence,inspectNewsletterContact} from '../server/getresponse-controlled.js';
import {htmlFormReady} from '../server/getresponse-form.js';
import {onRequest} from '../functions/api/subscribe.js';
const input={email:' Person@example.test ',consent:true,language:'es',requestId:'12345678-1234-1234-1234-123456789abc',legalVersion:'simulation-policy-v1'};
const policy={...newsletterTestPolicy,approved:true,version:input.legalVersion};
function setup(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('migrations/0006_newsletter_consent.sql','utf8'));const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};}};return {sqlite,env:{NEWSLETTER_TEST_LEGAL_APPROVED:'true',CONTROLLED_TEST_MODE:'true',NEWSLETTER_PREPARATION_ENABLED:'true',FORMS_DB:db,AUDIT_HASH_SECRET:'test-only-audit-secret-at-least-32-characters',NEWSLETTER_DATA_KEY:btoa('n'.repeat(32))}};}
test('confirmed HTML mapping sends only the supported fields, without API key or customFieldId parameter',()=>{
 const request=prepareControlledHtml(input);assert.equal(request.url,'https://app.getresponse.com/add_subscriber.html');assert.equal(request.options.redirect,'manual');
 assert.deepEqual([...new URLSearchParams(request.options.body)],[['email','person@example.test'],['campaign_token','PL6jh'],['custom_consentimiento','aceptado']]);
 assert.throws(()=>prepareControlledHtml({...input,consent:false}),/consent_required/);assert.throws(()=>prepareControlledHtml({...input,email:'a@b.test\r\nBcc:other@b.test'}),/invalid_email/);
});
test('consent records server time, server text/version and encrypted email; retries do not rewrite evidence',async()=>{
 const s=setup();try{
  const first=await recordControlledConsent(s.env,{...input,acceptedAt:'1990-01-01',consentText:'forged'},new Date('2026-10-20T10:00:00Z'),policy);
  assert.equal(first.evidence.accepted_at,'2026-10-20T10:00:00.000Z');assert.equal(first.evidence.consent_text,'Acepto recibir novedades de la colección por email.');assert.equal(first.evidence.custom_field_id,'njH9fM');assert.equal(first.founders,'pending');
  assert.ok(!JSON.stringify(first.evidence).includes('person@example.test'));assert.ok(await verifyConsentEvidence(first.evidence,s.env.AUDIT_HASH_SECRET));
  assert.equal(await verifyConsentEvidence({...first.evidence,accepted_at:'2026-01-01'},s.env.AUDIT_HASH_SECRET),false);
  const second=await recordControlledConsent(s.env,input,new Date('2026-10-21'),policy);assert.deepEqual(second.evidence,first.evidence);
  await assert.rejects(recordControlledConsent(s.env,{...input,email:'other@example.test'},new Date(),policy),/conflict/);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,1);
 }finally{s.sqlite.close();}
});
test('preparation is disabled by default, requires legal review/version, supports EN and never activates public signup',async()=>{
 const s=setup();try{
  await assert.rejects(recordControlledConsent({...s.env,NEWSLETTER_PREPARATION_ENABLED:'false'},input,new Date(),policy),/disabled/);
  await assert.rejects(recordControlledConsent(s.env,input),/disabled/);
  await assert.rejects(recordControlledConsent(s.env,{...input,legalVersion:'wrong'},new Date(),policy),/version/);
  const record=await recordControlledConsent(s.env,{...input,language:'en'},new Date(),policy);assert.equal(record.evidence.consent_text,'I agree to receive collection news by email.');
  assert.equal(htmlFormReady(s.env,true),false);assert.equal((await onRequest({env:s.env})).status,503);
 }finally{s.sqlite.close();}
});
test('custom value from the right API contact/list is not a confirmation date or entitlement',()=>{
 const expected={email:input.email,campaignId:'simulation-campaign'},contact={email:'person@example.test',campaign:{campaignId:expected.campaignId},createdOn:'2026-10-20T10:01:00Z',customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]};
 assert.deepEqual(inspectNewsletterContact(contact,expected),{customConsentStored:true,confirmationVerified:false,originalConfirmationAt:null,founders:'pending'});
 for(const changed of [{...contact,campaign:{campaignId:'wrong'}},{...contact,email:'other@example.test'},{...contact,customFieldValues:[{customFieldId:'wrong',value:['aceptado']}]},{...contact,customFieldValues:[{customFieldId:'njH9fM',value:['no']}]},{...contact,customFieldValues:[{customFieldId:'njH9fM',values:['aceptado']}]}])assert.equal(inspectNewsletterContact(changed,expected).customConsentStored,false);
});
