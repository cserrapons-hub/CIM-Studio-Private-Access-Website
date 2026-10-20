import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledTestBoundary} from '../server/controlled-test.js';
import {onRequest} from '../functions/_middleware.js';
import {onRequest as subscribe} from '../functions/api/subscribe.js';
import {GETRESPONSE_LIST,GETRESPONSE_HTML_ENDPOINT,prepareCloudflareHtmlRequest,htmlFormReady} from '../server/getresponse-form.js';
const env={CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:'https://controlled.example.test',CONTROLLED_TEST_USER:'owner',CONTROLLED_TEST_PASSWORD:'test-only-random-password-at-least-32-characters'};
const request=(path='/',auth,method='GET')=>new Request('https://controlled.example.test'+path,{method,headers:auth?{Authorization:auth}:{}});
const authorization='Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD);
test('controlled preview is closed without complete configuration or correct HTTPS origin',async()=>{
 assert.equal(await controlledTestBoundary(request(),{}),null);
 for(const changes of [{CONTROLLED_TEST_ORIGIN:''},{CONTROLLED_TEST_ORIGIN:'http://controlled.example.test'},{CONTROLLED_TEST_PASSWORD:'short'},{CONTROLLED_TEST_USER:'bad:name'}])assert.equal((await controlledTestBoundary(request(),{...env,...changes})).status,503);
 assert.equal((await controlledTestBoundary(new Request('https://alias.example.test/'),env)).status,403);
});
test('restricted preview requires server-validated Basic authentication and rejects spoofed identity headers',async()=>{
 for(const auth of [undefined,'Basic !!!','Bearer wrong','Basic '+btoa('wrong:password')]){
  const result=await controlledTestBoundary(request('/',auth),env);assert.equal(result.status,401);assert.equal(result.headers.get('Cache-Control'),'no-store');
 }
 const spoof=new Request('https://controlled.example.test/',{headers:{'CF-Access-Authenticated-User-Email':'owner@example.test'}});
 assert.equal((await controlledTestBoundary(spoof,env)).status,401);
 assert.equal(await controlledTestBoundary(request('/',authorization),env),null);
});
test('only exact provider webhook POST bypasses browser login, not other APIs or lookalike paths',async()=>{
 assert.equal(await controlledTestBoundary(request('/api/webhooks/getresponse',undefined,'POST'),env),null);
 for(const [path,method] of [['/api/webhooks/getresponse','GET'],['/api/webhooks/getresponse/','POST'],['/api/subscribe','POST'],['/api/config','GET']])assert.equal((await controlledTestBoundary(request(path,undefined,method),env)).status,401);
 assert.equal((await subscribe({env})).status,503);
});
test('middleware protects all preview content before next and preserves no-store/noindex after login',async()=>{
 let calls=0;const next=async()=>{calls++;return new Response('preview');};
 assert.equal((await onRequest({request:request(),env,next})).status,401);assert.equal(calls,0);
 const response=await onRequest({request:request('/',authorization),env,next});assert.equal(calls,1);
 assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert.equal(await response.text(),'preview');
});
test('support endpoint alone cannot enable server forwarding or claim consent evidence',()=>{
 assert.equal(GETRESPONSE_HTML_ENDPOINT,'https://app.getresponse.com/add_subscriber.html');
 assert.throws(()=>prepareCloudflareHtmlRequest({action:GETRESPONSE_HTML_ENDPOINT},{email:'test@example.test',consent:true}),/not_verified/);
 // SIMULATED field names only: these do not describe the real provider export.
 const review={exportReviewed:true,listName:GETRESPONSE_LIST.name,listToken:GETRESPONSE_LIST.token,panelListId:GETRESPONSE_LIST.panelId,listBindingVerified:true,doubleOptInVerified:true,nativeConsentVerified:true,abuseProtectionVerified:true,noAdditionalScriptsVerified:true,method:'POST',action:GETRESPONSE_HTML_ENDPOINT,reviewedOrigins:['https://app.getresponse.com'],emailField:'simulation_email',consentField:'simulation_consent',consentValue:'simulation_yes',hiddenFields:[['simulation_token',GETRESPONSE_LIST.token]],serverSubmissionVerified:true,serverConsentEvidenceVerified:true,providerAbuseControlsVerified:true,responseContractVerified:true,enctype:'application/x-www-form-urlencoded'};
 for(const flag of ['serverSubmissionVerified','serverConsentEvidenceVerified','providerAbuseControlsVerified','responseContractVerified'])assert.throws(()=>prepareCloudflareHtmlRequest({...review,[flag]:false},{email:'test@example.test',consent:true}),/not_verified/);
 const prepared=prepareCloudflareHtmlRequest(review,{email:'test@example.test',consent:true});assert.equal(prepared.options.redirect,'manual');assert.equal(new URLSearchParams(prepared.options.body).get('simulation_token'),'PL6jh');
 assert.throws(()=>prepareCloudflareHtmlRequest(review,{email:'test@example.test',consent:false}),/consent_required/);
 assert.equal(htmlFormReady(review,true),false);
});
