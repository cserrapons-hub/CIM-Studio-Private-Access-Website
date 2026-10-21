import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlFormReady,htmlFormReview,GETRESPONSE_FORM_ID,GETRESPONSE_LIST} from '../server/getresponse-form.js';
import {publicSettings} from '../server/settings.js';
import {onRequest} from '../functions/api/subscribe.js';
import {readFileSync} from 'node:fs';
test('standalone HTML release remains blocked until the real response and consent flow are reviewed',()=>{
 assert.equal(GETRESPONSE_FORM_ID,'9748c724-790b-4c48-bbde-29366c400934');
 assert.equal(htmlFormReview.complete,false);
 assert.equal(htmlFormReview.reason,'real_response_and_consent_flow_required');
 assert.equal(htmlFormReady({FORMS_ENABLED:'true',NEWSLETTER_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-html'},true),false);
 assert.equal(htmlFormReady({FORMS_ENABLED:'true',NEWSLETTER_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-hosted',GETRESPONSE_HOSTED_FORM_REVIEWED:'true',GETRESPONSE_HOSTED_FORM_URL:'https://cim.getresponse.com/example'},true),false);
 const config=publicSettings({},new URL('https://cim.test'));
 assert.equal(config.newsletter.provider,'getresponse-html');assert.equal(config.enabled.subscribe,false);
 assert.equal(Object.hasOwn(config.newsletter,'url'),false);
});
test('old public API signup cannot be activated accidentally; no tracking or hosted-link replacement is installed',async()=>{
 assert.equal((await onRequest({env:{FORMS_ENABLED:'true',NEWSLETTER_ENABLED:'true'}})).status,503);
 for(const file of ['public/index.html','public/integrations.js','public/script.js','public/_headers']){
  const source=readFileSync(file,'utf8');assert.ok(!/an\.gr-wcon\.com|GetResponseAnalyticsObject|GrTracking|hostedLink|GETRESPONSE_HOSTED_FORM_URL/.test(source),file);
 }
});
test('existing newsletter HTML retains its email and explicit unchecked mandatory consent without an invented external action',()=>{
 const html=readFileSync('public/index.html','utf8');
 const form=html.match(/<form data-form-kind="subscribe"[\s\S]*?<\/form>/)?.[0];assert.ok(form);
 assert.match(form,/<input[^>]*type="email"[^>]*required/);
 const checkbox=form.match(/<input[^>]*name="marketing_consent"[^>]*>/)?.[0];assert.ok(checkbox);
 assert.ok(/\brequired\b/.test(checkbox));assert.ok(!/\bchecked\b/.test(checkbox));
 assert.ok(!/\baction\s*=|\bformaction\s*=/.test(form));
 assert.ok(!/<script|<iframe|<getresponse-form/.test(form));
 assert.match(form,/data-open="legal-dialog"[^>]*data-legal="privacy"/);
});

test('official HTML adapter requires explicit reviewed evidence and never enables public submission',async()=>{
 const {prepareOfficialHtmlSubmission}=await import('../server/getresponse-form.js');
 // Entirely simulated names and destination; none represent GetResponse parameters.
 const fixture={exportReviewed:true,listName:GETRESPONSE_LIST.name,listToken:GETRESPONSE_LIST.token,panelListId:GETRESPONSE_LIST.panelId,listBindingVerified:true,
  doubleOptInVerified:true,nativeConsentVerified:true,abuseProtectionVerified:true,
  noAdditionalScriptsVerified:true,method:'POST',action:'https://provider.invalid/form',
  reviewedOrigins:['https://provider.invalid'],emailField:'simulated_email',
  consentField:'simulated_consent',consentValue:'simulated_accept',hiddenFields:[['simulated_list','test-only']]};
 const input={email:'  person@example.invalid  ',consent:true};
 assert.deepEqual(prepareOfficialHtmlSubmission(fixture,input),{method:'POST',action:fixture.action,
  fields:[['simulated_email','person@example.invalid'],['simulated_consent','simulated_accept'],['simulated_list','test-only']]});
 for(const flag of ['exportReviewed','listBindingVerified','doubleOptInVerified','nativeConsentVerified','abuseProtectionVerified','noAdditionalScriptsVerified']){
  assert.throws(()=>prepareOfficialHtmlSubmission({...fixture,[flag]:false},input),/not_verified/);
 }
 assert.throws(()=>prepareOfficialHtmlSubmission(null,input),/not_verified/);
 for(const changes of [{listName:'other'},{listToken:'wrong-token'},{panelListId:'other-id'},{listToken:undefined},{panelListId:undefined}]){
  assert.throws(()=>prepareOfficialHtmlSubmission({...fixture,...changes},input),/not_verified/);
 }
 assert.throws(()=>prepareOfficialHtmlSubmission(fixture,{...input,consent:false}),/consent_required/);
 assert.throws(()=>prepareOfficialHtmlSubmission(fixture,{...input,email:'not an email'}),/invalid_email/);
 assert.throws(()=>prepareOfficialHtmlSubmission({...fixture,hiddenFields:[['simulated_email','override']]},input),/not_verified/);
 for(const action of ['http://provider.invalid/form','https://elsewhere.invalid/form','https://user:pass@provider.invalid/form','https://provider.invalid/form?email=private','https://provider.invalid/form#fragment']){
  assert.throws(()=>prepareOfficialHtmlSubmission({...fixture,action},input),/not_verified/);
 }
 assert.equal(htmlFormReady(fixture,true),false);
});

test('confirmed account references do not invent a submission contract or substitute the API campaign ID',()=>{
 assert.ok(Object.isFrozen(GETRESPONSE_LIST));
 assert.equal(GETRESPONSE_LIST.name,'cim_studio_newsletter');
 assert.equal(GETRESPONSE_LIST.token,'PL6jh');assert.equal(GETRESPONSE_LIST.panelId,'374914302');
 assert.equal(GETRESPONSE_LIST.webDoubleOptInReported,true);assert.equal(GETRESPONSE_LIST.apiDoubleOptInReported,true);
 assert.equal(GETRESPONSE_LIST.plainHtmlAllowedReported,true);
 assert.equal(GETRESPONSE_LIST.subscriptionNotifications,'admin@cimstudio.es');
 assert.equal(GETRESPONSE_LIST.confirmationPage,'provider-default');
 assert.equal(htmlFormReview.complete,false);assert.equal(htmlFormReady(GETRESPONSE_LIST,true),false);
 assert.ok(!Object.hasOwn(GETRESPONSE_LIST,'action'));assert.ok(!Object.hasOwn(GETRESPONSE_LIST,'hiddenFields'));
 assert.ok(!Object.hasOwn(GETRESPONSE_LIST,'campaignId'));
 const config=publicSettings({GETRESPONSE_CAMPAIGN_ID:GETRESPONSE_LIST.panelId},new URL('https://cim.test'));
 assert.equal(config.enabled.subscribe,false);
 assert.equal(Object.hasOwn(config,'apiKey'),false);
});
