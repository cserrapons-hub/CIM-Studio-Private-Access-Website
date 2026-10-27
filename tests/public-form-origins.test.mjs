import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {handleRegistration} from '../server/registrations.js';
import legal from '../legal/content.js';
import {onRequest as middleware} from '../functions/_middleware.js';

test('actual handlers reject www, mismatched/missing Origin and cross-site POST before any provider or persistence',async()=>{
 const original=structuredClone(legal);
 Object.assign(legal,{approved:true,version:policy.version});
 try{for(const kind of ['subscribe','samples','careers']){
  const s=await fixture();Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:'https://cimstudio.es',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_ENABLED:'true',NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:'https://cimstudio.es'});
  let providerCalls=0;const fetcher=async()=>{providerCalls++;throw Error('No provider may be called');};
  const run=request=>kind==='subscribe'?handlePublicNewsletter(request,s.env,{policy,fetcher,logger:()=>{}}):handleRegistration(request,s.env,kind,fetcher);
  try{for(const [host,origin,site] of [['www.cimstudio.es','https://www.cimstudio.es','same-origin'],['cimstudio.es','https://www.cimstudio.es','same-site'],['cimstudio.es',null,'same-origin'],['cimstudio.es','https://cimstudio.es','cross-site']]){
   const headers={'Content-Type':'application/json','Sec-Fetch-Site':site};if(origin)headers.Origin=origin;
   const request=new Request('https://'+host+'/api/'+kind,{method:'POST',headers,body:JSON.stringify(kind==='samples'?s.sample:s.data)});
   const response=await middleware({request,env:s.env,next:()=>run(request)});
   assert.equal(response.status,403,kind);assert.deepEqual(await response.json(),{error:'origin'});assert.equal(response.headers.get('Location'),null);assert.equal(providerCalls,0);
   assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
   for(const store of [s.forms,s.careers])assert.equal(store.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
  }}finally{s.close();}
 }}finally{Object.assign(legal,original);}
});
