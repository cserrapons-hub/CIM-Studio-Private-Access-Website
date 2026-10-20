// Local-only cross-language contract test. Never connects to Render or GetResponse.
// Usage: CIM_PRODUCTION_CHECKOUT=/path/to/Cim-Production CIM_TEST_PYTHON=/path/to/python node scripts/test-production-integration.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {signedRequest,deliverFounderEvent} from '../server/production-delivery.js';
import {handleGetResponseWebhook} from '../server/getresponse-webhook.js';
import {drainOutbox} from '../server/production-outbox.js';
import {legal} from '../server/settings.js';
const checkout=process.env.CIM_PRODUCTION_CHECKOUT,python=process.env.CIM_TEST_PYTHON;
if(!checkout||!python||!existsSync(join(checkout,'private_access.py')))throw Error('Provide local Production checkout and test Python; no remote service is allowed');
const temp=mkdtempSync(join(tmpdir(),'cim-local-contract-'));
const secret='local-test-only-not-a-real-credential-123456';
const child=spawn(python,['-c',"from werkzeug.serving import make_server; from app import app; s=make_server('127.0.0.1',0,app); print(s.server_port,flush=True); s.serve_forever()"],{cwd:checkout,env:{PATH:process.env.PATH,LANG:'C.UTF-8',CIM_DATABASE:join(temp,'production.sqlite'),CIM_UPLOAD_DIR:join(temp,'uploads'),CIM_SECRET_KEY:'local-test-session-secret-only',CIM_PASSWORD:'local-test-only',CIM_PRIVATE_ACCESS_ENABLED:'true',CIM_PRIVATE_ACCESS_KEYS:JSON.stringify({'local-test':secret}),CIM_PRIVATE_ACCESS_CAMPAIGN_ID:'simulation-list'},stdio:['ignore','pipe','pipe']});
// Do not print request bodies, headers or server output. A failed startup is reported generically.
child.stderr.resume();
const reader=createInterface({input:child.stdout});
const timer=setTimeout(()=>child.kill(),30000);
const original=structuredClone(legal);
let sqlite;
try{
 const port=Number((await Promise.race([once(reader,'line').then(([line])=>line),once(child,'exit').then(()=>{throw Error('Local Flask startup failed');})])));
 assert.ok(Number.isInteger(port)&&port>0);
 const local='http://127.0.0.1:'+port;
 const env={CIM_PRODUCTION_DELIVERY_ENABLED:'true',CIM_PRODUCTION_URL:'https://local-production.example.test',CIM_PRODUCTION_KEY_ID:'local-test',CIM_PRODUCTION_HMAC_SECRET:secret};
 const localFetcher=(url,options)=>fetch(local+new URL(url).pathname,options);
 const event={version:1,event_id:'a'.repeat(64),email:'local-test@example.test',confirmed_at:'2026-01-02T10:00:00.000Z',source:'getresponse-double-opt-in',campaign_id:'simulation-list',contact_id:'simulation-contact',proof_hash:'b'.repeat(64),verification_version:'getresponse-doi-v1'};
 const first=await deliverFounderEvent(env,event,localFetcher);assert.equal(first.status,'accepted');assert.ok(first.customer_id>0);
 const duplicate=await deliverFounderEvent(env,event,localFetcher);assert.equal(duplicate.status,'duplicate');assert.equal(duplicate.customer_id,first.customer_id);
 const signed=await signedRequest(env,event);assert.equal((await localFetcher(signed.url,signed.options)).status,200);assert.equal((await localFetcher(signed.url,signed.options)).status,409);
 assert.equal((await deliverFounderEvent(env,{...event,event_id:'c'.repeat(64)},localFetcher)).customer_id,first.customer_id);
 await assert.rejects(deliverFounderEvent({...env,CIM_PRODUCTION_HMAC_SECRET:'wrong-local-signing-secret-1234567890'},event,localFetcher));
 await assert.rejects(deliverFounderEvent(env,{...event,email:'conflicting@example.test'},localFetcher));
 // Now exercise simulated provider -> actual JS receiver -> encrypted queue -> real Flask/SQLite.
 sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_forms.sql','0003_getresponse_webhook.sql','0004_production_outbox.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}};
 Object.assign(legal,{approved:true,version:'local-simulation-only',business:{name:'simulation'},es:{notice:'simulation',privacy:'simulation',cookies:'simulation'},en:{notice:'simulation',privacy:'simulation',cookies:'simulation'}});
 Object.assign(env,{GETRESPONSE_WEBHOOK_ENABLED:'true',GETRESPONSE_WEBHOOK_IPS_REVIEWED:'true',GETRESPONSE_WEBHOOK_GRANTS_ENABLED:'true',FOUNDERS_RECORDING_VERIFIED:'true',GETRESPONSE_WEBHOOK_CIDRS:'192.0.2.0/24',GETRESPONSE_CAMPAIGN_ID:'simulation-list',GETRESPONSE_API_KEY:'simulation-no-external-request',AUDIT_HASH_SECRET:'local-test-audit-secret-1234567890123456',FORMS_DB:db,OUTBOX_RECONCILIATION_REVIEWED:'true',OUTBOX_MAX_PENDING_SECONDS:'3600',OUTBOX_RECEIPT_SECONDS:'3600',OUTBOX_ENCRYPTION_KEY:btoa('a'.repeat(32))});
 const contract={shapeVerified:true,authenticationVerified:true,confirmationSemanticsVerified:true,eventName:'contact-subscribed',expectedFormId:'simulation-form',paths:{type:['type'],email:['email'],contactId:['id'],campaignId:['list'],formId:['form']}};
 const makeRequest=()=>{const request=new Request('https://local.example.test/api/webhooks/getresponse',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.2'},body:JSON.stringify({type:'contact-subscribed',occurredAt:event.confirmed_at,email:event.email,id:event.contact_id,list:event.campaign_id,form:'simulation-form'})});Object.defineProperty(request,'cf',{value:{colo:'TEST'}});return request;};
 let outage=true;
 const fetcher=(url,options)=>url.startsWith('https://api.getresponse.com/')?Promise.resolve(Response.json({contactId:event.contact_id,email:event.email,campaign:{campaignId:event.campaign_id}})):outage?Promise.resolve(new Response(null,{status:503})):localFetcher(url,options);
 assert.equal((await handleGetResponseWebhook(makeRequest(),env,fetcher,new Date(),contract)).status,202);
 let queued=sqlite.prepare('SELECT * FROM production_outbox').get();assert.equal(queued.state,'pending');assert.ok(!queued.encrypted_payload.includes(event.email));
 // Simulate recovery without a real wait, using the actual transport and live local receiver.
 sqlite.exec('UPDATE production_outbox SET next_attempt=0');outage=false;
 const result=await drainOutbox(env,fetcher);assert.equal(result.delivered,1);
 queued=sqlite.prepare('SELECT * FROM production_outbox').get();assert.equal(queued.state,'delivered');assert.equal(queued.encrypted_payload,null);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM gr_webhook_receipts').get().n,0);
 assert.equal((await handleGetResponseWebhook(makeRequest(),env,fetcher,new Date(),contract)).status,202);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM gr_webhook_receipts').get().n,0);
 console.log('PASS local JS -> Flask/SQLite: HMAC, wrong key, nonce replay, event conflict, idempotent customer, simulated DOI webhook, encrypted outage/retry, acknowledgement/purge. No external services contacted.');
}finally{
 clearTimeout(timer);Object.assign(legal,original);sqlite?.close();reader.close();if(child.exitCode===null&&child.signalCode===null){const ended=once(child,'exit');child.kill();await ended.catch(()=>{});}rmSync(temp,{recursive:true,force:true});
}
