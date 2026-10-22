import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import legal from '../legal/content.js';
import {newsletterTestPolicy,resolveNewsletterTestPolicy} from '../server/newsletter-test-policy.js';
import {newsletterTestConfiguration,onRequest as configRoute} from '../functions/api/controlled/newsletter-config.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import {controlledNewsletterReady,handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {onRequest as publicSubscribe} from '../functions/api/subscribe.js';
import {publicSettings} from '../server/settings.js';
const env={CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:'https://cim-studio-test.pages.dev',CONTROLLED_TEST_USER:'owner',CONTROLLED_TEST_PASSWORD:'simulation-password-at-least-32-characters',SITE_LIVE:'false'};
const auth='Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD);
const request=(path='/api/controlled/newsletter-config',authenticated=true)=>new Request(env.CONTROLLED_TEST_ORIGIN+path,{headers:authenticated?{Authorization:auth}:{}});
const allFlags={...env,NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:'simulation-subscriber-type',GETRESPONSE_API_KEY:'simulation-api-key',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_TEST_LEGAL_APPROVED:'true',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true',NEWSLETTER_TEST_EMAIL_HASH:'a'.repeat(64),NEWSLETTER_TEST_ALLOWLIST_SECRET:btoa('l'.repeat(32)),NEWSLETTER_DATA_KEY:btoa('n'.repeat(32)),AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-characters',TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret',FORMS_DB:{prepare(){throw Error('No DB operation allowed');}}};
test('express private approval never bypasses runtime gates or approves public documents',async()=>{
 assert.equal(newsletterTestPolicy.approved,true);assert.equal(newsletterTestPolicy.version,'newsletter-private-test-v1');assert.equal(legal.approved,false);
 const closed={...allFlags,NEWSLETTER_TEST_LEGAL_APPROVED:'false'};
 const resolved=resolveNewsletterTestPolicy(closed);assert.equal(resolved.approved,false);
 assert.equal(resolveNewsletterTestPolicy(allFlags,{...newsletterTestPolicy,approved:false}).approved,false);
 assert.equal(controlledNewsletterReady(closed),false);
 const response=await handleControlledNewsletter(new Request(env.CONTROLLED_TEST_ORIGIN+'/api/controlled/subscribe',{method:'POST'}),closed,{fetcher:()=>{throw Error('No external request allowed');}});assert.equal(response.status,503);
 assert.equal((await publicSubscribe({env:allFlags})).status,503);assert.equal(publicSettings(allFlags,new URL(env.CONTROLLED_TEST_ORIGIN)).enabled.subscribe,false);
});
test('test approval requires reviewed code, nonempty version and independent runtime acknowledgement',()=>{
 const reviewed={...newsletterTestPolicy,approved:true,version:'simulation-test-v1'};
 assert.equal(resolveNewsletterTestPolicy({},reviewed).approved,false);
 assert.equal(resolveNewsletterTestPolicy({NEWSLETTER_TEST_LEGAL_APPROVED:'true'},reviewed).approved,true);
 assert.equal(resolveNewsletterTestPolicy({NEWSLETTER_TEST_LEGAL_APPROVED:'true'},{...reviewed,version:''}).approved,false);
 assert.equal(controlledNewsletterReady({...allFlags,NEWSLETTER_TEST_LEGAL_APPROVED:'false'},reviewed),false);
 assert.equal(controlledNewsletterReady(allFlags,reviewed),true);
 assert.equal(resolveNewsletterTestPolicy(allFlags,{...reviewed,en:{...reviewed.en,privacy:''}}).approved,false);
 assert.equal(controlledNewsletterReady(allFlags,{...reviewed,es:{...reviewed.es,consent:''}}),false);
 assert.equal(legal.approved,false);
});
test('private config stays closed without runtime acknowledgement and exposes text, never secrets or authorised email',async()=>{
 assert.equal((await configRoute({request:request(undefined,false),env})).status,401);
 const response=await configRoute({request:request(),env:{...allFlags,NEWSLETTER_TEST_LEGAL_APPROVED:'false'}}),body=await response.json();assert.equal(response.status,200);
 assert.equal(body.testOnly,true);assert.equal(body.enabled,false);assert.equal(body.siteKey,null);assert.equal(body.policy.approved,false);assert.equal(body.policy.version,null);
 assert.match(body.policy.es.privacy,/BORRADOR/);assert.match(body.policy.en.privacy,/DRAFT/);
 const serialised=JSON.stringify(body);for(const name of ['NEWSLETTER_DATA_KEY','NEWSLETTER_TEST_ALLOWLIST_SECRET','AUDIT_HASH_SECRET','TURNSTILE_SECRET_KEY','NEWSLETTER_TEST_EMAIL_HASH']){assert.ok(!serialised.includes(name));assert.ok(!serialised.includes(allFlags[name]));}
 assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
});
test('private page, assets and APIs fail closed when controlled mode is off, on public origin or without login',async()=>{
 for(const path of ['/controlled/newsletter/','/controlled/newsletter/test.js','/controlled/newsletter/test.css','/api/controlled/newsletter-config','/api/controlled/subscribe','/controlled%2Fnewsletter/test.js','//controlled/newsletter/test.css']){
  let calls=0;const next=async()=>{calls++;return new Response('private');};
  assert.equal((await middleware({request:request(path),env:{...env,CONTROLLED_TEST_MODE:'false'},next})).status,503,path);
  assert.equal((await middleware({request:request(path,false),env,next})).status,401,path);
  assert.equal((await middleware({request:request(path),env:{...env,CONTROLLED_TEST_ORIGIN:'https://cimstudio.es'},next})).status,503,path);
  assert.equal(calls,0,path);
 }
 assert.equal((await configRoute({request:request(),env:{...env,CONTROLLED_TEST_MODE:'false'}})).status,503);
});
test('authenticated private UI stays disabled without acquisition or Turnstile script activation',async()=>{
 const response=await middleware({request:request('/controlled/newsletter/'),env,next:async()=>new Response(readFileSync('public/controlled/newsletter/index.html'))});
 assert.equal(response.status,200);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 const html=await response.text();assert.match(html,/<fieldset disabled>/);
 const checkbox=html.match(/<input[^>]*name="consent"[^>]*>/)?.[0];assert.ok(checkbox);assert.match(checkbox,/required/);assert.ok(!/\bchecked\b/.test(checkbox));
 assert.match(html,/id="privacy-link"/);assert.match(html,/<dialog id="test-privacy"/);assert.ok(!/\baction=|https:\/\/challenges/.test(html));
});
test('test approval does not remove owner-email restriction, private-origin checks or send gates',async()=>{
 const reviewed={...newsletterTestPolicy,approved:true,version:'simulation-test-v1'};
 const config=await newsletterTestConfiguration(request(),allFlags,reviewed);assert.equal((await config.json()).enabled,true);
 for(const key of ['NEWSLETTER_PREPARATION_ENABLED','NEWSLETTER_CONTROLLED_SEND_ENABLED'])assert.equal(controlledNewsletterReady({...allFlags,[key]:'false'},reviewed),false);
 assert.equal(controlledNewsletterReady({...allFlags,CONTROLLED_TEST_ORIGIN:'https://cimstudio.es'},reviewed),false);
 assert.equal(controlledNewsletterReady({...allFlags,NEWSLETTER_TEST_ALLOWLIST_SECRET:''},reviewed),false);
 assert.equal(legal.approved,false);
});
