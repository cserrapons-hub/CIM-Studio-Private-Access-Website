import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {recordControlledConsent} from '../server/getresponse-controlled.js';
import {newsletterDiagnostic} from '../server/newsletter-diagnostic.js';
import {onRequest} from '../functions/api/controlled/newsletter-diagnostic.js';
import {controlledNewsletterReady} from '../server/getresponse-controlled-handler.js';
const at=new Date('2026-10-21T16:04:49Z'),t=Math.floor(at.getTime()/1000);
async function setup(){
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true',NEWSLETTER_HTML404_RETRY_ENABLED:'true',NEWSLETTER_HTML404_RETRY_PARENT_ID:s.data.requestId});
 const {evidence}=await recordControlledConsent(s.env,s.data,at,policy);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(s.data.requestId,evidence.subject_hash,at.toISOString(),at.toISOString(),0);
 s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits VALUES(?,?,?,?,?,?,1,NULL)').run(s.data.requestId,crypto.randomUUID(),evidence.subject_hash,t,t+600,'CIM Studio simulation');
 const req=(method='GET',headers={})=>new Request(s.env.CONTROLLED_TEST_ORIGIN+'/api/controlled/newsletter-diagnostic',{method,headers:{Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD),...headers}});
 const run=(env=s.env,changes={})=>newsletterDiagnostic(req(),env,{policy,now:at,...changes});return {...s,req,run};
}
test('diagnostic returns exactly five safe fields, reads only SELECT, preserves all rows and performs no fetch',async()=>{
 const s=await setup();const fetch=globalThis.fetch;try{
 globalThis.fetch=()=>{throw Error('No network permitted');};
 const before=JSON.stringify(s.forms.sqlite.prepare('SELECT * FROM newsletter_retry_permits').all());
 const prepare=s.env.FORMS_DB.prepare.bind(s.env.FORMS_DB);s.env.FORMS_DB.prepare=sql=>{assert.match(sql,/^SELECT /);return prepare(sql);};
 const r=await s.run(),body=await r.json();assert.deepEqual(body,{configuration:'valid',failedChecks:[],d1:'ok',consentHmac:'valid',permit:'valid'});
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 assert.equal(JSON.stringify(s.forms.sqlite.prepare('SELECT * FROM newsletter_retry_permits').all()),before);
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_retry_attempts').get().n,0);
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM form_rate_limits').get().n,0);
 for(const value of [s.data.email,s.data.requestId,s.env.AUDIT_HASH_SECRET,s.env.GETRESPONSE_API_KEY,s.env.NEWSLETTER_TEST_EMAIL_HASH])assert.ok(!JSON.stringify(body).includes(value));
 }finally{globalThis.fetch=fetch;s.close();}
});
test('expired permit still verifies HMAC and reports configuration failures independently',async()=>{
 const s=await setup();try{const r=await s.run({...s.env,NEWSLETTER_PREPARATION_ENABLED:'false',NEWSLETTER_DATA_KEY:'wrong'},{now:new Date(at.getTime()+700000)}),body=await r.json();assert.equal(body.configuration,'invalid');assert.ok(body.failedChecks.includes('NEWSLETTER_PREPARATION_ENABLED'));assert.ok(body.failedChecks.includes('NEWSLETTER_DATA_KEY_FORMAT'));assert.equal(body.consentHmac,'valid');assert.equal(body.permit,'expired');assert.equal(body.d1,'ok');}finally{s.close();}
});
test('general checks mirror readiness and expose only static condition names',async()=>{
 const s=await setup();try{
 for(const change of [{GETRESPONSE_CAMPAIGN_ID:'wrong'},{GETRESPONSE_API_KEY:''},{TURNSTILE_SITE_KEY:''},{TURNSTILE_SECRET_KEY:''},{NEWSLETTER_DATA_KEY:btoa('short')},{AUDIT_HASH_SECRET:'short'},{NEWSLETTER_TEST_ALLOWLIST_SECRET:'bad'},{NEWSLETTER_TEST_ALLOWLIST_SECRET:s.env.AUDIT_HASH_SECRET},{NEWSLETTER_TEST_EMAIL_HASH:'A'.repeat(64)},{NEWSLETTER_API_REVIEWED:'false'},{NEWSLETTER_TEST_LEGAL_APPROVED:'false'},{NEWSLETTER_PREPARATION_ENABLED:'false'},{NEWSLETTER_CONTROLLED_SEND_ENABLED:'false'},{FORMS_DB:null}]){
 const env={...s.env,...change};assert.equal(controlledNewsletterReady(env,policy),false);const body=await (await s.run(env)).json();assert.equal(body.configuration,'invalid');assert.ok(body.failedChecks.length>0);assert.ok(body.failedChecks.every(v=>/^[A-Z0-9_]+$/.test(v)));
 }
 }finally{s.close();}
});
test('wrong audit key or tampered historical consent reports invalid HMAC without exposing evidence',async()=>{
 const s=await setup();try{
 assert.equal((await (await s.run({...s.env,AUDIT_HASH_SECRET:'wrong-but-valid-length-audit-key-for-simulation'})).json()).consentHmac,'invalid');
 s.forms.sqlite.exec("UPDATE newsletter_consent_requests SET consent_text='PRIVATE TAMPERED TEXT'");const body=await (await s.run()).json();assert.equal(body.consentHmac,'invalid');assert.ok(!JSON.stringify(body).includes('PRIVATE'));
 }finally{s.close();}
});
test('D1 read/prepare errors are sanitised and independent evidence checks survive an unrelated table failure',async()=>{
 const s=await setup();try{
 const missing=await (await s.run({...s.env,FORMS_DB:null})).json();assert.equal(missing.d1,'not_checked');assert.equal(missing.consentHmac,'not_checked');
 const failure=await (await s.run({...s.env,FORMS_DB:{prepare(){throw Error('PRIVATE SECRET TRACE');}}})).json();assert.equal(failure.d1,'error');assert.equal(failure.consentHmac,'not_checked');assert.equal(failure.permit,'not_checked');assert.ok(!JSON.stringify(failure).includes('PRIVATE'));
 s.forms.sqlite.exec('DROP TABLE newsletter_retry_permits');const partial=await (await s.run()).json();assert.equal(partial.d1,'error');assert.equal(partial.consentHmac,'valid');assert.equal(partial.permit,'not_checked');
 }finally{s.close();}
});
test('missing parent, missing evidence, malformed or consumed permit are safely distinguished',async()=>{
 for(const mode of ['parent','evidence','id','permit','inactive','consumed','future','uuid']){const s=await setup();try{
 let env=s.env;
 if(mode==='parent')env={...s.env,NEWSLETTER_HTML404_RETRY_PARENT_ID:crypto.randomUUID()};if(mode==='id')env={...s.env,NEWSLETTER_HTML404_RETRY_PARENT_ID:'bad'};
 if(mode==='evidence')s.forms.sqlite.exec('DELETE FROM newsletter_consent_requests');if(mode==='permit')s.forms.sqlite.exec('DELETE FROM newsletter_retry_permits');if(mode==='inactive')s.forms.sqlite.exec('UPDATE newsletter_retry_permits SET active=0');if(mode==='consumed')s.forms.sqlite.exec('UPDATE newsletter_retry_permits SET consumed_at=1');if(mode==='future')s.forms.sqlite.prepare('UPDATE newsletter_retry_permits SET issued_at=?,expires_at=?').run(t+10,t+600);if(mode==='uuid')s.forms.sqlite.exec("UPDATE newsletter_retry_permits SET api_request_id='bad'");
 const body=await (await s.run(env)).json();assert.equal(body.permit,mode==='id'?'not_checked':'invalid');if(mode==='id')assert.equal(body.consentHmac,'not_checked');
 }finally{s.close();}}
});
test('authentication, exact private origin and GET-only protections cannot be bypassed',async()=>{
 const s=await setup();try{
 let reads=0;const env={...s.env,FORMS_DB:{prepare(){reads++;throw Error('Should not read');}}};
 for(const change of [{CONTROLLED_TEST_MODE:'false'},{SITE_LIVE:'true'},{CONTROLLED_TEST_ORIGIN:'https://cimstudio.es'}])assert.notEqual((await newsletterDiagnostic(s.req(),{...env,...change})).status,200);
 assert.equal((await newsletterDiagnostic(s.req('GET',{Authorization:'Basic '+btoa('wrong:wrong')}),env)).status,401);
 assert.equal((await newsletterDiagnostic(s.req('POST'),env)).status,405);assert.equal(reads,0);
 assert.equal((await onRequest({request:s.req(),env:{...s.env,NEWSLETTER_CONTROLLED_SEND_ENABLED:'false'}})).status,200);
 }finally{s.close();}
});
test('cryptographic execution errors are reported without raw messages or masking an expired permit',async()=>{
 const s=await setup(),descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');try{
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:descriptor.get?descriptor.get.call(globalThis).subtle.digest.bind(descriptor.get.call(globalThis).subtle):globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle),importKey(){throw Error('PRIVATE CRYPTO TRACE');}}}});
 const body=await (await s.run(s.env,{now:new Date(at.getTime()+700000)})).json();assert.equal(body.consentHmac,'error');assert.equal(body.permit,'expired');assert.ok(!JSON.stringify(body).includes('PRIVATE'));
 }finally{Object.defineProperty(globalThis,'crypto',descriptor);s.close();}
});
