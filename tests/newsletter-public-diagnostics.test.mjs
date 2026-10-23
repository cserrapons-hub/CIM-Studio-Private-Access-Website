import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {prepareNewsletterApi} from '../server/getresponse-api-submission.js';
const privateMarker='PRIVATE-CREDENTIAL-BODY-TRACE';
async function setup(mode='ok',onFetch=()=>{}){
 const s=await fixture(),entries=[],calls=[];
 Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_ENABLED:'true',NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:'https://cimstudio.es'});
 const bad=()=>{throw Error(privateMarker+' '+s.data.email+' '+s.env.GETRESPONSE_API_KEY);};
 const fetcher=async(url,options)=>{onFetch(url,options);
  if(url.includes('siteverify')){calls.push('turnstile');if(mode==='turnstile_network')bad();if(mode==='turnstile_http')return new Response(privateMarker,{status:502});if(mode==='turnstile_json')return new Response(privateMarker);return Response.json({success:mode!=='turnstile_proof',hostname:'cimstudio.es',action:'subscribe'});}
  if(url.includes('/campaigns/')){calls.push('campaign');if(mode==='campaign_network')bad();if(mode==='campaign_timeout'){const e=Error(privateMarker);e.name='TimeoutError';throw e;}if(mode==='campaign_http')return new Response(privateMarker,{status:401});if(mode==='campaign_redirect')return new Response(null,{status:302,headers:{Location:'https://example.test/'+privateMarker}});if(mode==='campaign_json')return new Response(privateMarker);return Response.json({campaignId:'PL6jh',name:mode==='campaign_identity'?'wrong':'cim_studio_newsletter',optinTypes:{api:mode==='campaign_optin'?'single':'double'}});}
  if(url.includes('/contacts?')){calls.push('contacts');if(mode==='contacts_network')bad();if(mode==='contacts_http')return new Response(privateMarker,{status:403});return Response.json(mode==='contacts_shape'?[{email:s.data.email}]:[]);}
  calls.push('send');assert.equal(options.redirect,'manual');assert.equal(options.signal.aborted,false);if(mode==='send_timeout'){const e=Error(privateMarker);e.name='TimeoutError';throw e;}return new Response(privateMarker,{status:mode==='send_rejected'?422:mode==='send_uncertain'?503:202});
 };
 const request=()=>new Request('https://cimstudio.es/api/subscribe',{method:'POST',headers:{Origin:'https://cimstudio.es','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(s.data)});
 return {...s,entries,calls,run:(logger=entry=>entries.push(entry))=>handlePublicNewsletter(request(),s.env,{policy,fetcher,logger})};
}
function safeEntry(s,stage,code,status=null){
 assert.equal(s.entries.length,1);const entry=s.entries[0];
 assert.deepEqual(Object.keys(entry).sort(),['stage','code','providerStatus','requestId'].sort());
 assert.equal(entry.stage,stage);assert.equal(entry.code,code);assert.equal(entry.providerStatus,status);
 assert.match(entry.requestId,/^[a-f0-9-]{36}$/);assert.notEqual(entry.requestId,s.data.requestId);
 const encoded=JSON.stringify(entry);
 for(const value of [privateMarker,s.data.email,s.env.GETRESPONSE_API_KEY,s.env.TURNSTILE_SECRET_KEY,s.env.AUDIT_HASH_SECRET,s.data.token,s.data.requestId,'192.0.2.1'])assert.ok(!encoded.includes(value));
}
test('public diagnostics identify provider failures without leaking provider text, credentials or visitor details',async()=>{
 const cases=[['turnstile_network','turnstile','provider_transport',503,null],['turnstile_http','turnstile','provider_http',503,502],['turnstile_json','turnstile','provider_response',503,200],['turnstile_proof','turnstile','challenge',403,200],['campaign_network','getresponse_campaign','campaign_network',503,null],['campaign_timeout','getresponse_campaign','campaign_timeout',503,null],['campaign_http','getresponse_campaign','campaign_http',503,401],['campaign_redirect','getresponse_campaign','campaign_redirect',503,302],['campaign_json','getresponse_campaign','campaign_response',503,null],['campaign_identity','getresponse_campaign','campaign_identity',503,null],['campaign_optin','getresponse_campaign','campaign_optin',503,null],['contacts_network','getresponse_contacts','contacts_network',503,null],['contacts_http','getresponse_contacts','contacts_http',503,403],['contacts_shape','getresponse_contacts','contacts_verification',503,null],['send_timeout','getresponse_send','provider_timeout',409,null],['send_rejected','getresponse_send','provider_rejected',502,422],['send_uncertain','getresponse_send','pending',409,503]];
 for(const [mode,stage,code,http,provider] of cases){const s=await setup(mode);try{const response=await s.run();assert.equal(response.status,http,mode);const body=await response.text();assert.ok(!body.includes(stage));assert.ok(!body.includes(privateMarker));safeEntry(s,stage,code,provider);assert.equal(s.calls.filter(x=>x==='send').length,mode.startsWith('send_')?1:0);}finally{s.close();}}
});
test('D1 errors identify rate, deduplication, consent, delivery claim, API record and receipt stages',async()=>{
 const cases=[['form_rate_limits','d1_rate_limits','rate_limit_storage',503],['newsletter_html_deliveries','d1_deduplication','deduplication_storage',503],['newsletter_consent_requests','consent_persistence','consent_storage',503],['newsletter_api_deliveries','d1_api_delivery','api_delivery_storage',409],['newsletter_http_receipts','d1_http_receipt','receipt_storage',409]];
 for(const [table,stage,code,http] of cases){const s=await setup();try{s.forms.sqlite.exec('DROP TABLE '+table);const response=await s.run();assert.equal(response.status,http);safeEntry(s,stage,code,table==='newsletter_http_receipts'?202:null);assert.equal(s.calls.includes('send'),table==='newsletter_http_receipts');}finally{s.close();}}
 const s=await setup();try{const original=s.env.FORMS_DB.prepare;s.env.FORMS_DB.prepare=sql=>{if(sql.startsWith('INSERT OR IGNORE INTO newsletter_html_deliveries'))throw Error(privateMarker);return original(sql);};assert.equal((await s.run()).status,503);safeEntry(s,'d1_delivery_claim','delivery_claim_storage');assert.ok(!s.calls.includes('send'));}finally{s.close();}
});
test('readiness errors are logged safely, logger failures never change responses, successful replay still sends once',async()=>{
 const blocked=await setup();try{blocked.env.NEWSLETTER_ENABLED='false';assert.equal((await blocked.run()).status,503);safeEntry(blocked,'configuration','configuration_unavailable');assert.deepEqual(blocked.calls,[]);}finally{blocked.close();}
 const broken=await setup('campaign_http');try{const response=await broken.run(()=>{throw Error(privateMarker);});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});}finally{broken.close();}
 const s=await setup();try{assert.equal((await s.run()).status,202);assert.equal((await s.run()).status,202);assert.equal(s.calls.filter(x=>x==='send').length,1);assert.deepEqual(s.entries,[]);s.forms.sqlite.prepare("UPDATE newsletter_consent_requests SET evidence_mac='invalid'").run();assert.equal((await s.run()).status,503);safeEntry(s,'d1_deduplication','deduplication_storage');assert.equal(s.calls.filter(x=>x==='send').length,1);}finally{s.close();}
});
test('public POST timeout starts only at sending; early header validation and other callers retain their contract',async()=>{
 const original=AbortSignal.timeout,signals=[];
 const s=await setup('ok',(url,options)=>{
  const expected=url.includes('siteverify')?1:url.includes('/campaigns/')?2:url.includes('/contacts?')?3:4;
  assert.equal(signals.length,expected,'timeout is created at its own network operation');
  if(url.includes('/contacts?'))for(const controller of signals)controller.abort();
  if(expected===4)assert.equal(options.signal.aborted,false,'prior read timeouts cannot expire the POST');
 });
 AbortSignal.timeout=ms=>{assert.equal(ms,12000);const controller=new AbortController();signals.push(controller);return controller.signal;};
 try{
  const deferred=prepareNewsletterApi(s.env,s.data.email,'particular',{startTimeout:false});assert.equal(deferred.options.signal,undefined);assert.equal(signals.length,0);
  assert.throws(()=>prepareNewsletterApi({...s.env,GETRESPONSE_API_KEY:'bad\r\n'+privateMarker},s.data.email,'particular',{startTimeout:false}));
  const response=await s.run();assert.equal(response.status,202);assert.equal(signals.length,4,'Turnstile, campaign GET, contacts GET and POST each create their own timeout');
  prepareNewsletterApi(s.env,s.data.email,'particular');assert.equal(signals.length,5,'existing private adapter retains default timeout');
 }finally{AbortSignal.timeout=original;s.close();}
});
