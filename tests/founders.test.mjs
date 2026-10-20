import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {prepareFounder,recordFounder,findFounder,founderSubject,FOUNDERS_CUTOFF} from '../server/founders.js';
const secret='simulation-only-secret-at-least-32-characters';
const now=new Date('2027-02-01T12:00:00Z');
const evidence={source:'getresponse-confirmation',reviewed:true,email:'Person@example.test',campaignId:'test-campaign',contactId:'test-contact',confirmedAt:'2026-12-31T23:59:59+01:00',verifiedAt:'2027-01-15T12:00:00Z',evidenceSha256:'a'.repeat(64),evidenceReference:'reviewed-confirmation-test'};
function store(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('migrations/0001_forms.sql','utf8'));sqlite.exec(readFileSync('tests/fixtures/legacy-founders.sql','utf8'));
 return {sqlite,prepare(sql){let values=[];return {bind(...v){values=v;return this;},async run(){return sqlite.prepare(sql).run(...values);},async first(){return sqlite.prepare(sql).get(...values)||null;}};}};
}
test('Founders cutoff uses actual confirmation in Europe/Madrid, not request or verification date',async()=>{
 assert.equal(FOUNDERS_CUTOFF,'2026-12-31T23:00:00.000Z');
 const record=await prepareFounder(evidence,secret,now);
 assert.equal(record.confirmedAt,'2026-12-31T22:59:59.000Z');assert.ok(record.verifiedAt>FOUNDERS_CUTOFF);
 for(const confirmedAt of ['2027-01-01T00:00:00+01:00','2026-12-31T23:00:00Z','2027-01-01T00:00:00'])
  await assert.rejects(prepareFounder({...evidence,confirmedAt},secret,now));
});
test('No request date, contact creation, redirect, unreviewed or future evidence can grant Founders',async()=>{
 for(const changes of [{source:'getresponse-createdOn'},{source:'welcome-redirect'},{source:'form-request'},{reviewed:false},{confirmedAt:undefined},{confirmedAt:'2026-02-30T10:00:00Z'},{evidenceSha256:''},{verifiedAt:'2028-01-01T00:00:00Z'},{verifiedAt:'2020-01-01T00:00:00Z'},{contactId:'bad@example.test'}])
  await assert.rejects(prepareFounder({...evidence,...changes},secret,now));
});
test('Independent durable record is idempotent, contains no plain email and survives marketing deletion',async()=>{
 const db=store(),record=await prepareFounder(evidence,secret,now);
 await recordFounder(db,record);await recordFounder(db,record);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM founders_entitlements').get().n,1);
 assert.ok(!JSON.stringify(db.sqlite.prepare('SELECT * FROM founders_entitlements').get()).includes('@'));
 db.sqlite.exec('DELETE FROM form_requests');
 assert.deepEqual({...await findFounder(db,'PERSON@EXAMPLE.TEST',secret)},{confirmed_at:record.confirmedAt,terms_version:'founders-2026-v1'});
 assert.equal(await findFounder(db,'other@example.test',secret),null);
 assert.equal(await founderSubject(' person@example.test ',secret),record.subjectHash);
});
test('Conflicting or reused evidence never overwrites an existing entitlement',async()=>{
 const db=store(),record=await prepareFounder(evidence,secret,now);await recordFounder(db,record);
 await assert.rejects(recordFounder(db,{...record,evidenceSha256:'b'.repeat(64)}));
 const other=await prepareFounder({...evidence,email:'other@example.test'},secret,now);
 await assert.rejects(recordFounder(db,other));
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM founders_entitlements').get().n,1);
 assert.equal(db.sqlite.prepare('SELECT evidence_sha256 FROM founders_entitlements').get().evidence_sha256,evidence.evidenceSha256);
});
