import test from 'node:test';
import assert from 'node:assert/strict';
import {readGetResponse,verifyNewsletter} from '../server/getresponse-newsletter.js';
import {observeNewsletter} from '../server/newsletter-observations.js';
import {fixture,policy} from './helpers/launch-fixture.mjs';
test('GetResponse reads use Workers-compatible manual redirects and an explicit GET with no body',async()=>{
 const calls=[];const r=await verifyNewsletter('simulation-key','PL6jh',async(url,options)=>{
  assert.equal(url,'https://api.getresponse.com/v3/campaigns/PL6jh');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.body,undefined);assert.equal(options.headers.Accept,'application/json');assert.equal(options.headers['X-Auth-Token'],'api-key simulation-key');assert.ok(options.signal instanceof AbortSignal);calls.push(url);
  return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
 });assert.equal(r.campaignId,'PL6jh');assert.equal(calls.length,1);
});
test('campaign and contact redirects are rejected without following Location or leaking it',async()=>{
 for(const operation of ['campaign','contacts'])for(const status of [301,302,303,307,308]){
  let calls=0;
  await assert.rejects(readGetResponse(async()=>{calls++;return new Response('PRIVATE BODY',{status,headers:{Location:'https://untrusted.example.test/private-token'}});},'simulation-key','/campaigns/PL6jh',operation),e=>{assert.equal(e.code,operation+'_redirect');assert.equal(e.providerStatus,status);assert.ok(!e.message.includes('private-token'));assert.ok(!e.message.includes('simulation-key'));return true;});assert.equal(calls,1);
 }
});
test('invalid auth headers fail as request construction errors before reaching the fetcher',async()=>{
 for(const operation of ['campaign','contacts']){
  let calls=0;
  await assert.rejects(readGetResponse(async()=>{calls++;throw Error();},'simulation-key\r\nPRIVATE','/campaigns/PL6jh',operation),e=>{assert.equal(e.code,operation+'_request');assert.equal(e.providerStatus,null);assert.ok(!e.message.includes('PRIVATE'));return true;});assert.equal(calls,0);
 }
});
test('timeouts and network failures remain separate and do not expose raw runtime errors',async()=>{
 for(const operation of ['campaign','contacts'])for(const [name,suffix] of [['TimeoutError','_timeout'],['AbortError','_timeout'],['TypeError','_network'],['Error','_network']]){
  let calls=0;
  await assert.rejects(readGetResponse(async()=>{calls++;const error=Error('PRIVATE DNS/TLS/CREDENTIAL DETAIL');error.name=name;throw error;},'simulation-key','/campaigns/PL6jh',operation),e=>{assert.equal(e.code,operation+suffix);assert.equal(e.providerStatus,null);assert.ok(!e.message.includes('PRIVATE'));return true;});assert.equal(calls,1);
 }
});
test('observation exposes only safe construction/timeout/redirect diagnostics and cannot create subscription requests',async()=>{
 for(const mode of ['bad_header','campaign_redirect','contacts_redirect','timeout']){
  const s=await fixture();s.env.GETRESPONSE_CAMPAIGN_ID='PL6jh';if(mode==='bad_header')s.env.GETRESPONSE_API_KEY='simulation\r\nPRIVATE';let calls=0;
  try{
   const response=await observeNewsletter(s.request('/api/controlled/newsletter-observation',{email:s.data.email,phase:'before'}),s.env,{policy,fetcher:async(url,options)=>{
    calls++;assert.equal(options.redirect,'manual');assert.equal(options.method,'GET');
    if(mode==='timeout')throw new DOMException('PRIVATE','TimeoutError');
    if(mode==='campaign_redirect'||mode==='contacts_redirect'&&url.includes('/contacts?'))return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/private-token'}});
    return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
   }}),body=await response.json();assert.equal(response.status,503);
   assert.equal(body.diagnostic.code,mode==='bad_header'?'campaign_request':mode==='timeout'?'campaign_timeout':mode);assert.ok(!JSON.stringify(body).includes('PRIVATE'));assert.ok(!JSON.stringify(body).includes(s.data.email));assert.ok(!JSON.stringify(body).includes('private-token'));
   assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,0);if(mode==='bad_header')assert.equal(calls,0);
  }finally{s.close();}
 }
});
