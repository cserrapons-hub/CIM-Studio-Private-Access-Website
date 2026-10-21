import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import legal from '../legal/content.js';
import {newsletterTestPolicy,resolveNewsletterTestPolicy} from '../server/newsletter-test-policy.js';
import {registrationTestPolicies,resolveRegistrationTestPolicy} from '../server/registration-test-policy.js';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {onRequest as samples} from '../functions/api/controlled/samples.js';
import {onRequest as careers} from '../functions/api/controlled/careers.js';
import {publicSettings} from '../server/settings.js';
import {fixture} from './helpers/launch-fixture.mjs';
test('express approval records exactly 372193d text without granting public approval or opening any runtime gate',async()=>{
 const expected={
  'newsletter-private-test-v1':'f954bae6deff0edb91b4b5c20b36d398d4e89056c0a05fbbfac6da57a4690629',
  'samples-private-test-v1':'3f512cf184082bd1ae30a4caaf699636536b15927c19eb2de0b2af304a03dde8',
  'careers-private-test-v1':'f97b79a2be44f2e93b863974e23d288b50bf77517741f876c2b09795c836d7f8'
 };
 for(const p of [newsletterTestPolicy,...Object.values(registrationTestPolicies)]){
  assert.equal(p.approved,true);assert.equal(p.approval.date,'2026-10-21');assert.equal(p.approval.scope,'private-controlled-test-only');assert.equal(p.approval.contentCommit,'372193daa923c55ce731bd3f7d0dd7003834b48f');
  assert.equal(createHash('sha256').update(JSON.stringify({version:p.version,es:p.es,en:p.en})).digest('hex'),expected[p.version]);
 }
 const s=await fixture();try{
  const closed={...s.env};
  for(const file of ['.dev.vars.example','config/controlled-test.vars.example'])for(const line of readFileSync(file,'utf8').split('\n')){
   const match=line.match(/^([A-Z0-9_]+)=(true|false)$/);if(!match)continue;
   if(match[1]==='CONTROLLED_TEST_MODE'){assert.equal(match[2],'true');continue;}
   assert.equal(match[2],'false','No example gate may be enabled');closed[match[1]]='false';
  }
  assert.equal(legal.approved,false);assert.equal(resolveNewsletterTestPolicy(closed).approved,false);
  for(const kind of ['samples','careers'])assert.equal(resolveRegistrationTestPolicy(closed,kind).approved,false);
  const blocked=()=>{throw Error('No real network call allowed');};
  assert.equal((await handleControlledNewsletter(s.request('/api/controlled/subscribe',s.data),closed,{fetcher:blocked})).status,503);
  assert.equal((await samples({request:s.request('/api/controlled/samples',s.sample),env:closed})).status,503);
  assert.equal((await careers({request:s.request('/api/controlled/careers',s.data),env:closed})).status,503);
  assert.deepEqual(publicSettings(closed,new URL('https://cimstudio.es')).enabled,{subscribe:false,samples:false,careers:false});
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
 }finally{s.close();}
});
