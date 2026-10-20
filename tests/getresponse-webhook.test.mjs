import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleGetResponseWebhook} from '../server/getresponse-webhook.js';
import {getresponseWebhookContract} from '../server/getresponse-webhook-contract.js';
import {legal} from '../server/settings.js';
import {allowedSender} from '../server/ip-ranges.js';
const original=structuredClone(legal);
afterEach(()=>{Object.assign(legal,structuredClone(original));});
// SIMULATED mapping, not a claim about the real GetResponse payload.
// Production adapter intentionally remains unverified until real docs/payload review.
const contract={shapeVerified:true,authenticationVerified:true,confirmationSemanticsVerified:true,eventName:'contact-subscribed',expectedFormId:'9748c724-790b-4c48-bbde-29366c400934',
 paths:{type:['simulationType'],email:['simulationContact','email'],contactId:['simulationContact','id'],campaignId:['simulationList'],formId:['simulationForm']}};
const now=new Date('2027-01-02T12:00:00Z');
function setup(){
 Object.assign(legal,{approved:true,version:'simulation-legal',business:{name:'test'},es:{notice:'test',privacy:'test',cookies:'test'},en:{notice:'test',privacy:'test',cookies:'test'}});
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['migrations/0001_forms.sql','tests/fixtures/legacy-founders.sql','migrations/0003_getresponse_webhook.sql','migrations/0004_production_outbox.sql'])sqlite.exec(readFileSync(file,'utf8'));
 const db={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){const result=sqlite.prepare(sql).run(...args);return {...result,meta:{changes:Number(result.changes)}};},async all(){return {results:sqlite.prepare(sql).all(...args)};}};}};
 const env={GETRESPONSE_WEBHOOK_ENABLED:'true',GETRESPONSE_WEBHOOK_IPS_REVIEWED:'true',GETRESPONSE_WEBHOOK_CIDRS:'192.0.2.0/24,2001:db8::/32',GETRESPONSE_WEBHOOK_GRANTS_ENABLED:'true',FOUNDERS_RECORDING_VERIFIED:'true',GETRESPONSE_CAMPAIGN_ID:'simulation-list',GETRESPONSE_API_KEY:'simulation-key',AUDIT_HASH_SECRET:'simulation-secret-at-least-32-characters',FORMS_DB:db};
 const payload={simulationType:'contact-subscribed',occurredAt:'2026-12-31T22:59:59Z',simulationContact:{id:'simulation-contact',email:'person@example.test'},simulationList:'simulation-list',simulationForm:contract.expectedFormId};
 const request=(changes={},headers={})=>{
  const r=new Request('https://cim.test/api/webhooks/getresponse',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.4',...headers},body:JSON.stringify({...payload,...changes})});
  Object.defineProperty(r,'cf',{value:{colo:'MAD'}});return r;
 };
 const calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return Response.json({contactId:'simulation-contact',email:'person@example.test',campaign:{campaignId:'simulation-list'}});};
 const run=(r=request(),overrides={},c=contract,f=fetcher)=>handleGetResponseWebhook(r,{...env,...overrides},f,now,c);
 return {sqlite,db,env,payload,request,fetcher,calls,run};
}
test('production webhook defaults and unverified payload contract cannot store data or grant benefits',async()=>{
 const s=setup();
 assert.equal(getresponseWebhookContract.shapeVerified,false);assert.equal(getresponseWebhookContract.confirmationSemanticsVerified,false);
 for(const c of [getresponseWebhookContract,contract])assert.equal((await s.run(s.request(),{GETRESPONSE_WEBHOOK_ENABLED:'false'},c)).status,503);
 assert.equal((await s.run(s.request(),{},getresponseWebhookContract)).status,503);
 legal.approved=false;assert.equal((await s.run()).status,503);assert.equal(s.calls.length,0);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM gr_webhook_receipts').get().n,0);
});
test('IP allowlist validates IPv4 and IPv6, rejects malformed addresses and broad/incomplete lists',()=>{
 assert.equal(allowedSender('192.0.2.8','192.0.2.0/24'),true);assert.equal(allowedSender('192.0.3.8','192.0.2.0/24'),false);
 assert.equal(allowedSender('2001:db8::42','2001:db8::/32'),true);assert.equal(allowedSender('2001:db9::42','2001:db8::/32'),false);
 for(const [ip,list] of [['192.0.2.8','0.0.0.0/0'],['192.0.2.8','192.0.2.0/24,bad'],['999.0.0.1','192.0.2.0/24'],['2001:::42','2001:db8::/32'],['192.0.2.8','']])assert.equal(allowedSender(ip,list),false);
});
test('spoofed headers, missing Cloudflare metadata and wrong optional secret cannot authenticate events',async()=>{
 const s=setup();
 assert.equal((await s.run(s.request({}, {'CF-Connecting-IP':'198.51.100.3','X-Forwarded-For':'192.0.2.4','User-Agent':'GetResponse'}))).status,403);
 const noMetadata=new Request(s.request());assert.equal((await s.run(noMetadata)).status,403);
 const key='simulation-bearer-at-least-32-characters';
 assert.equal((await s.run(s.request(),{GETRESPONSE_WEBHOOK_BEARER_SECRET:key})).status,403);
 assert.equal((await s.run(s.request({}, {Authorization:'Bearer '+key}),{GETRESPONSE_WEBHOOK_BEARER_SECRET:key})).status,503);
});
test('verified events wait for CIM Production and cannot grant in a second D1 customer register',async()=>{
 const s=setup();assert.equal((await s.run()).status,503);assert.equal((await s.run()).status,503);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
 const receipt=s.sqlite.prepare('SELECT * FROM gr_webhook_receipts').get();
 assert.equal(receipt.occurred_at,'2026-12-31T22:59:59.000Z');
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM gr_webhook_receipts').get().n,1);
 assert.equal(receipt.state,'quarantined');assert.equal(receipt.reason,'awaiting_cim_production');
 assert.ok(!JSON.stringify(receipt).includes('@'));
});
test('unverified semantics, missing/wrong form or disabled granting only quarantine; no benefit',async()=>{
 for(const variant of ['semantics','authentication','missingForm','wrongForm']){
  const s=setup(),payload=variant==='missingForm'?{simulationForm:undefined}:variant==='wrongForm'?{simulationForm:'other-form'}:{};
  const c={...contract,confirmationSemanticsVerified:variant!=='semantics',authenticationVerified:variant!=='authentication'};
  assert.equal((await s.run(s.request(payload),variant==='flag'?{GETRESPONSE_WEBHOOK_GRANTS_ENABLED:'false'}:{},c)).status,202);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
  assert.equal(s.sqlite.prepare('SELECT state FROM gr_webhook_receipts').get().state,'quarantined');
 }
});
test('foreign account, provider outage and immediate-unsubscribe lookup failure never grant; candidate survives',async()=>{
 for(const status of ['foreign',404,500]){
  const s=setup(),fetcher=async()=>status==='foreign'?Response.json({contactId:'other',email:'person@example.test',campaign:{campaignId:'other'}}):new Response(null,{status});
  assert.equal((await s.run(s.request(),{},contract,fetcher)).status,status==='foreign'?403:503);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
  assert.equal(s.sqlite.prepare('SELECT state FROM gr_webhook_receipts').get().state,'quarantined');
 }
});
test('wrong list, missing/bad timestamp and future dates never grant; cutoff midnight is excluded',async()=>{
 for(const changes of [{simulationList:'other'},{occurredAt:undefined},{occurredAt:'2026-02-30T12:00:00Z'},{occurredAt:'2027-01-03T12:00:00Z'},{occurredAt:'2026-12-31T22:59:59'}]){
  const s=setup();assert.equal((await s.run(s.request(changes))).status,400);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
 }
 const s=setup();assert.equal((await s.run(s.request({occurredAt:'2026-12-31T23:00:00Z'}))).status,204);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
});
test('unsubscribe never revokes anything and repeated confirmations create no D1 customers',async()=>{
 const s=setup();await s.run();const before=s.sqlite.prepare('SELECT * FROM gr_webhook_receipts').get();
 assert.equal((await s.run(s.request({simulationType:'contact-unsubscribed'}))).status,204);
 assert.deepEqual(s.sqlite.prepare('SELECT * FROM gr_webhook_receipts').get(),before);
 assert.equal((await s.run(s.request({occurredAt:'2026-12-31T22:59:59.999Z'}))).status,503);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
});
test('oversized/non-JSON bodies and DB failure never acknowledge an unrecorded event',async()=>{
 const s=setup();assert.equal((await s.run(s.request({extra:'x'.repeat(17000)}))).status,400);
 assert.equal((await s.run(s.request({}, {'Content-Type':'text/plain'}))).status,400);
 assert.equal((await s.run(s.request(),{FORMS_DB:{prepare(){throw Error('storage failure');}}})).status,503);
});
test('webhook method and per-provider-IP rate limit are enforced before additional provider reads',async()=>{
 const s=setup();
 assert.equal((await s.run(new Request('https://cim.test/api/webhooks/getresponse'))).status,405);
 await s.run();
 s.sqlite.exec('UPDATE form_rate_limits SET count=600');
 const response=await s.run();
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'3600');
 assert.equal(s.calls.length,1);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
});

function deliveryEnvironment(){return {OUTBOX_RECONCILIATION_REVIEWED:'true',CIM_PRODUCTION_DELIVERY_ENABLED:'true',CIM_PRODUCTION_URL:'https://production.example.test',CIM_PRODUCTION_KEY_ID:'test-v1',CIM_PRODUCTION_HMAC_SECRET:'simulation-transport-secret-at-least-32-characters',OUTBOX_ENCRYPTION_KEY:btoa('a'.repeat(32)),OUTBOX_MAX_PENDING_SECONDS:'3600',OUTBOX_RECEIPT_SECONDS:'3600'};}
test('only reviewed authenticated DOI evidence can enter the encrypted delivery queue',async()=>{
 const s=setup(),env=deliveryEnvironment();
 const fetcher=async(url,options)=>url.startsWith('https://api.getresponse.com/')?s.fetcher(url,options):Response.json({event_id:JSON.parse(options.body).event_id,status:'accepted',customer_id:42});
 const c={...contract,authenticationVerified:false};
 assert.equal((await s.run(s.request(),env,c,fetcher)).status,202);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM production_outbox').get().n,0);
 assert.equal((await s.run(s.request(),env,contract,fetcher)).status,202);
 const queued=s.sqlite.prepare('SELECT * FROM production_outbox').get();
 assert.equal(queued.state,'delivered');assert.equal(queued.encrypted_payload,null);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM founders_entitlements').get().n,0);
});
test('receiver outage keeps an encrypted retryable event without falsely granting a benefit',async()=>{
 const s=setup(),env=deliveryEnvironment();
 const fetcher=async(url,options)=>url.startsWith('https://api.getresponse.com/')?s.fetcher(url,options):new Response(null,{status:503});
 assert.equal((await s.run(s.request(),env,contract,fetcher)).status,202);
 const row=s.sqlite.prepare('SELECT * FROM production_outbox').get();assert.equal(row.state,'pending');
 assert.ok(row.encrypted_payload);assert.ok(!JSON.stringify(row).includes('person@example.test'));assert.equal(row.attempts,1);
 assert.equal((await s.run(s.request(),env,contract,fetcher)).status,202);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM production_outbox').get().n,1);
 assert.equal(s.sqlite.prepare('SELECT attempts FROM production_outbox').get().attempts,1);
});
test('missing transport retention configuration cannot acknowledge an undeliverable verified event',async()=>{
 const s=setup(),env=deliveryEnvironment();delete env.OUTBOX_MAX_PENDING_SECONDS;
 assert.equal((await s.run(s.request(),env)).status,503);
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM production_outbox').get().n,0);
});
