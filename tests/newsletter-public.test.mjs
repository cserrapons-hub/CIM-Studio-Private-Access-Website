import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {newsletterPublicReady,newsletterRelease,acceptedNewsletterResponse} from '../server/newsletter-release.js';
import {onRequest} from '../functions/api/subscribe.js';
const profile={approved:true,version:'SIMULATED-NOT-A-REAL-CONTRACT',acceptedResponse:{status:302,location:'https://provider.example.test/simulated-accepted'}};
async function setup(){const s=await fixture();Object.assign(s.env,{NEWSLETTER_ENABLED:'true',NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-html',NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:'https://cimstudio.es'});const req=(changes={},headers={})=>new Request('https://cimstudio.es/api/subscribe',{method:'POST',headers:{Origin:'https://cimstudio.es','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify({...s.data,...changes})});let provider=0;const mock={status:302,location:profile.acceptedResponse.location,throw:false};const fetcher=async(url,options)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'cimstudio.es',action:'subscribe'});assert.equal(url,'https://app.getresponse.com/add_subscriber.html');assert.equal(options.redirect,'manual');provider++;if(mock.throw)throw Error('simulation timeout');return new Response('SIMULATED ONLY',{status:mock.status,headers:{Location:mock.location}});};return {...s,req,mock,run:(changes={},headers={})=>handlePublicNewsletter(req(changes,headers),s.env,{fetcher,policy,profile}),count:()=>provider};}
test('public newsletter cannot be activated by environment flags or scoped test approval without reviewed source contract',async()=>{
 const s=await setup();try{assert.equal(newsletterRelease.approved,false);assert.equal(newsletterPublicReady(s.env,true),false);assert.equal((await onRequest({request:s.req(),env:s.env})).status,503);assert.equal(s.count(),0);}finally{s.close();}
});
test('future public readiness requires full legal approval, evidence review, verified flow and HTTPS canonical origin',async()=>{
 const s=await setup();try{assert.equal(newsletterPublicReady(s.env,true,profile),true);assert.equal(newsletterPublicReady(s.env,false,profile),false);for(const changes of [{NEWSLETTER_PUBLIC_ENABLED:'false'},{NEWSLETTER_VERIFIED:'false'},{NEWSLETTER_EVIDENCE_REVIEWED:'false'},{NEWSLETTER_ORIGIN:'https://wrong.test'},{NEWSLETTER_DATA_KEY:'bad'}])assert.equal(newsletterPublicReady({...s.env,...changes},true,profile),false);}finally{s.close();}
});
test('only exact reviewed response qualifies, never another redirect/query/error or a creation timestamp',()=>{
 assert.equal(acceptedNewsletterResponse(new Response(null,{status:302,headers:{Location:profile.acceptedResponse.location}}),profile),true);
 for(const response of [new Response(null,{status:200}),new Response(null,{status:302,headers:{Location:profile.acceptedResponse.location+'?error=yes'}}),new Response(null,{status:303,headers:{Location:profile.acceptedResponse.location}}),new Response(null,{status:500})])assert.equal(acceptedNewsletterResponse(response,profile),false);
});
test('simulated accepted public request records consent and acknowledgement but no confirmation or Founders; replays send no email',async()=>{
 const s=await setup();try{
  const response=await s.run();assert.equal(response.status,202);assert.deepEqual(await response.json(),{ok:true,subscription:'confirmation_required'});assert.equal(s.count(),1);
  assert.equal((await s.run()).status,202);assert.equal(s.count(),1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_http_receipts').get().n,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,0);
 }finally{s.close();}
});
test('unknown responses, provider failures and timeouts never display confirmation or retry with new IDs',async()=>{
 for(const scenario of ['timeout','unexpected','error']){const s=await setup();try{
  if(scenario==='timeout')s.mock.throw=true;if(scenario==='unexpected')s.mock.location='https://provider.example.test/other';if(scenario==='error')s.mock.status=500;
  const response=await s.run();assert.equal(response.status,409);assert.equal((await response.json()).error,'pending');assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_http_receipts').get().n,0);
  assert.equal((await s.run({requestId:crypto.randomUUID()})).status,409);assert.equal(s.count(),1);
 }finally{s.close();}}
});
test('public rejection, cross-origin, invalid consent and stale versions fail safely',async()=>{
 const s=await setup();try{
  assert.equal((await s.run({}, {Origin:'https://attacker.test'})).status,403);assert.equal((await s.run({consent:false})).status,400);assert.equal((await s.run({legalVersion:'old'})).status,400);assert.equal(s.count(),0);
  s.mock.status=422;const response=await s.run();assert.equal(response.status,502);assert.ok(!(await response.text()).includes('SIMULATED'));assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'rejected');
 }finally{s.close();}
});
