import test from 'node:test';
import assert from 'node:assert/strict';
import {testCleanupPlan} from '../server/test-cleanup-plan.js';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {recordControlledConsent} from '../server/getresponse-controlled.js';
test('cleanup defaults preserve newsletter/Founders evidence and never emits broad deletes',()=>{
 const base={authorised:true,mailStoppedConfirmed:true,providerReconciled:true,newsletter:['12345678-1234-1234-1234-123456789abc']};
 const plan=testCleanupPlan(base);assert.equal(plan.retainedNewsletterEvidence,true);assert.equal(plan.FORMS_DB.length,0);
 assert.throws(()=>testCleanupPlan({...base,providerReconciled:false}));assert.throws(()=>testCleanupPlan({...base,samples:["'; DROP TABLE registrations;"]}));
 const scoped=testCleanupPlan({...base,newsletterDecision:'erase-after-reviewed-rights'});assert.ok(scoped.FORMS_DB.every(q=>q.includes(' WHERE ')));assert.ok(scoped.FORMS_DB.every(q=>!q.includes('DROP')&&!q.includes('TRUNCATE')));
});
test('scoped cleanup removes only the chosen test evidence and preserves unrelated records/schema',async()=>{
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_PREPARATION_ENABLED:'true'});
 try{
  const first=await recordControlledConsent(s.env,s.data,new Date(),policy);
  const other=await recordControlledConsent(s.env,{...s.data,email:'other@example.test',requestId:crypto.randomUUID()},new Date(),policy);
  const plan=testCleanupPlan({authorised:true,mailStoppedConfirmed:true,providerReconciled:true,newsletterDecision:'erase-after-reviewed-rights',newsletter:[first.evidence.request_id]});
  for(const statement of plan.FORMS_DB)s.forms.sqlite.exec(statement);
  assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,1);assert.equal(s.forms.sqlite.prepare('SELECT request_id FROM newsletter_consent_requests').get().request_id,other.evidence.request_id);assert.equal(s.forms.sqlite.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 }finally{s.close();}
});
