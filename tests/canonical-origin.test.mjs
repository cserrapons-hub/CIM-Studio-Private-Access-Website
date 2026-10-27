import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';

test('www navigation redirects to fixed HTTPS apex preserving paths and queries',async()=>{
 for(const method of ['GET','HEAD'])for(const path of ['/','/?lang=en&utm_source=example','/careers/preferences/?lang=en','/bienvenido/','/api/config','/a%20b?next=https%3A%2F%2Fexample.test%2F']){
  let calls=0;const response=await onRequest({request:new Request('https://www.cimstudio.es'+path,{method}),env:{},next:()=>{calls++;}});
  assert.equal(response.status,308);assert.equal(response.headers.get('Location'),'https://cimstudio.es'+path);assert.equal(calls,0);assert.equal(await response.text(),'');
 }
});
test('canonical domain, Pages previews and foreign lookalike hosts are not redirected',async()=>{
 for(const host of ['cimstudio.es','cim-studio-test.pages.dev','www.cimstudio.es.example.test']){
  let calls=0;const response=await onRequest({request:new Request('https://'+host+'/'),env:{},next:async()=>{calls++;return new Response('unchanged');}});
  assert.equal(response.status,200);assert.equal(calls,1);assert.equal(response.headers.get('Location'),null);
 }
});
test('POST for all three APIs is never redirected or replayed across origins',async()=>{
 for(const kind of ['subscribe','samples','careers']){
  let calls=0;const response=await onRequest({request:new Request('https://www.cimstudio.es/api/'+kind,{method:'POST',headers:{Origin:'https://www.cimstudio.es'}}),env:{},next:async()=>{calls++;return Response.json({error:'origin'},{status:403});}});
  assert.equal(calls,1);assert.equal(response.status,403);assert.equal(response.headers.get('Location'),null);
 }
});
