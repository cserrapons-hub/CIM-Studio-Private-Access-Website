import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {signedRequest,deliverFounderEvent} from '../server/production-delivery.js';
import {enqueueVerifiedEvent,drainOutbox} from '../server/production-outbox.js';
const event = {version:1,event_id:'a'.repeat(64),email:'person@example.com',confirmed_at:'2026-12-31T22:59:59Z',source:'getresponse-double-opt-in',campaign_id:'list',contact_id:'contact',proof_hash:'b'.repeat(64),verification_version:'getresponse-doi-v1'};
const config = {CIM_PRODUCTION_DELIVERY_ENABLED:'true',CIM_PRODUCTION_URL:'https://cim.example',CIM_PRODUCTION_KEY_ID:'test',CIM_PRODUCTION_HMAC_SECRET:'test-only-not-real-secret-123456789',OUTBOX_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),OUTBOX_RECONCILIATION_REVIEWED:'true',OUTBOX_MAX_PENDING_SECONDS:'3600',OUTBOX_RECEIPT_SECONDS:'600'};
function sqlite() {
 const directory=mkdtempSync(join(tmpdir(),'cim-outbox-')),path=join(directory,'test.sqlite');
 function query(sql,args=[],script=false){
  const py = 'import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row\np=json.loads(sys.argv[2])\nif p["script"]: c.executescript(p["sql"]); r=[]\nelse: r=c.execute(p["sql"],p["args"]).fetchall()\nc.commit();print(json.dumps({"results":[dict(x) for x in r],"meta":{"changes":c.total_changes}}))';
  const output=spawnSync('python3',['-c',py,path,JSON.stringify({sql,args,script})],{encoding:'utf8',timeout:10000});
  if(output.status) throw new Error(output.stderr); return JSON.parse(output.stdout);
 }
 query(readFileSync(new URL('../migrations/0004_production_outbox.sql',import.meta.url),'utf8'),[],true);
 return {prepare(sql){return {bind(...args){return {async run(){return query(sql,args)},async first(){return query(sql,args).results[0]},async all(){return query(sql,args)}}}}},close(){rmSync(directory,{recursive:true,force:true})}};
}
const ack = (status='accepted') => new Response(JSON.stringify({event_id:event.event_id,status,customer_id:status==='review'?null:4}),{headers:{'Content-Type':'application/json'}});
test('production HMAC binds exact body, target, timestamp and random nonce',async()=>{
 const request=await signedRequest(config,event,1000000),h=request.options.headers;
 const canonical=['v1','POST','/integrations/private-access/founders','1000',h['X-CIM-Nonce'],createHash('sha256').update(request.options.body).digest('hex')].join('\n');
 assert.equal(h['X-CIM-Signature'],createHmac('sha256',config.CIM_PRODUCTION_HMAC_SECRET).update(canonical).digest('hex'));
 assert.equal(request.options.redirect,'error');
 assert.notEqual(h['X-CIM-Nonce'],(await signedRequest(config,event,1000000)).options.headers['X-CIM-Nonce']);
});
test('production delivery rejects disabled, unsafe URL, forged or mismatched ack',async()=>{
 await assert.rejects(deliverFounderEvent({...config,CIM_PRODUCTION_DELIVERY_ENABLED:'false'},event));
 for(const url of ['http://cim.example','https://secret@cim.example','https://cim.example?token=secret']) await assert.rejects(signedRequest({...config,CIM_PRODUCTION_URL:url},event));
 await assert.rejects(deliverFounderEvent(config,event,async()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));
 await assert.rejects(deliverFounderEvent(config,event,async()=>new Response('oops',{status:503})));
 assert.equal((await deliverFounderEvent(config,event,async()=>ack())).status,'accepted');
});
test('encrypted queue retries failures, deduplicates, purges payload after ack and expires receipt',async()=>{
 const db=sqlite(),env={...config,FORMS_DB:db};
 try {
  await enqueueVerifiedEvent(env,event,1000000); await enqueueVerifiedEvent(env,Object.fromEntries(Object.entries(event).reverse()),1000000);
  const row=await db.prepare('SELECT * FROM production_outbox').bind().first();
  assert.ok(!row.encrypted_payload.includes(event.email)); assert.equal(row.state,'pending');
  await assert.rejects(enqueueVerifiedEvent(env,{...event,email:'other@example.com'},1000000),/conflicting_event/);
  assert.equal((await drainOutbox(env,async()=>new Response('',{status:503}),1000000)).retry,1);
  let calls=0; assert.equal((await drainOutbox(env,async()=>{calls++;return ack()},1001000)).delivered,0);assert.equal(calls,0);
  assert.equal((await drainOutbox(env,async()=>ack('duplicate'),1031000)).delivered,1);
  const delivered=await db.prepare('SELECT * FROM production_outbox').bind().first();
  assert.equal(delivered.encrypted_payload,null);assert.equal(delivered.state,'delivered');
  await drainOutbox(env,async()=>ack(),1631000);assert.equal(await db.prepare('SELECT * FROM production_outbox').bind().first(),undefined);
 } finally {db.close()}
});
test('expired queue and ambiguous receiver require reconciliation, never silent grant or deletion',async()=>{
 const db=sqlite(),env={...config,FORMS_DB:db};
 try {
  await enqueueVerifiedEvent(env,event,1000000);
  assert.equal((await drainOutbox(env,async()=>ack('review'),1000000)).reconciliation,1);
  const row=await db.prepare('SELECT * FROM production_outbox').bind().first();assert.ok(row.encrypted_payload);assert.equal(row.state,'reconciliation');
  await enqueueVerifiedEvent(env,{...event,event_id:'c'.repeat(64)},1000000);
  assert.equal((await drainOutbox(env,async()=>{throw new Error('must not send expired')},4600000)).reconciliation,2);
 } finally {db.close()}
});
test('delivery queue requires explicit finite retention and does not permit unknown fields',async()=>{
 const db=sqlite();try{
  await assert.rejects(enqueueVerifiedEvent({...config,FORMS_DB:db,OUTBOX_MAX_PENDING_SECONDS:undefined},event));
  await assert.rejects(enqueueVerifiedEvent({...config,FORMS_DB:db},{...event,discount:15}));
 }finally{db.close()}
});
