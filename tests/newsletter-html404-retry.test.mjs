import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {recordControlledConsent,verifyConsentEvidence} from '../server/getresponse-controlled.js';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {newsletterTestConfiguration} from '../functions/api/controlled/newsletter-config.js';
const at=new Date('2026-10-21T10:00:00Z'),seconds=Math.floor(at.getTime()/1000);
async function setup(){
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true',NEWSLETTER_HTML404_RETRY_ENABLED:'true',NEWSLETTER_HTML404_RETRY_PARENT_ID:s.data.requestId});
 const oldId=s.data.requestId,newId=crypto.randomUUID();
 const {evidence}=await recordControlledConsent(s.env,s.data,new Date('2026-10-21T09:00:00Z'),policy);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(oldId,evidence.subject_hash,'2026-10-21T09:00:00Z','2026-10-21T09:00:00Z',0);
 const old=s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get();
 s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits(parent_request_id,api_request_id,subject_hash,issued_at,expires_at,approved_by,active) VALUES(?,?,?,?,?,?,1)').run(oldId,newId,evidence.subject_hash,seconds-1,seconds+600,'CIM Studio — simulation');
 const calls=[],mock={status:202,throwAt:null,contacts:[],optin:'double',challenge:true};let clock=at;
 const fetcher=async(url,options)=>{
 calls.push({url,options});assert.equal(options.redirect,'manual');
 if(url.includes('siteverify'))return Response.json({success:mock.challenge,hostname:'cim-studio-test.pages.dev',action:'subscribe'});
 const permit=s.forms.sqlite.prepare('SELECT * FROM newsletter_retry_permits').get();assert.equal(permit.active,0);assert.equal(permit.consumed_at,seconds);
 if(mock.throwAt==='campaign'&&url.includes('/campaigns/'))throw new DOMException('PRIVATE','TimeoutError');
 assert.equal(options.headers['X-Auth-Token'],'api-key '+s.env.GETRESPONSE_API_KEY);
 if(url.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:mock.optin}});
 if(url.includes('/contacts?'))return Response.json(mock.contacts);
 assert.equal(url,'https://api.getresponse.com/v3/contacts');assert.equal(options.method,'POST');
 assert.deepEqual(JSON.parse(options.body),{email:s.data.email,campaign:{campaignId:'PL6jh'},customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]});
 assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_retry_attempts').get().state,'sending');
 const consent=s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').get(newId);assert.ok(await verifyConsentEvidence(consent,s.env.AUDIT_HASH_SECRET));
 if(mock.throwAt==='post')throw new DOMException('PRIVATE PROVIDER MESSAGE','TimeoutError');return new Response('PRIVATE PROVIDER CONTENT',{status:mock.status,headers:{Location:'https://never-follow.example.test'}});
 };
 const request=(change={},headers={})=>s.request('/api/controlled/subscribe',{...s.data,requestId:newId,...change},headers);
 const run=(change={},env=s.env,headers={})=>handleControlledNewsletter(request(change,headers),env,{policy,fetcher,now:()=>clock});
 const unchanged=()=>{assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_html_deliveries').get(),old);assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').get(oldId),evidence);};
 return {...s,oldId,newId,old,evidence,mock,calls,request,run,unchanged,setClock:value=>clock=value,posts:()=>calls.filter(c=>c.url==='https://api.getresponse.com/v3/contacts')};
}
test('one-shot API attempt has its own ID and evidence while the HTML 404 and common deduplication ledger remain byte-for-byte intact',async()=>{
 const s=await setup();try{
 const r=await s.run(),body=await r.json();assert.equal(r.status,202);assert.equal(body.delivery,'accepted');assert.equal(body.confirmationVerified,false);assert.equal(body.founders,'pending');assert.equal(s.posts().length,1);
 const attempt=s.forms.sqlite.prepare('SELECT * FROM newsletter_retry_attempts').get();assert.equal(attempt.request_id,s.newId);assert.equal(attempt.parent_request_id,s.oldId);assert.equal(attempt.state,'accepted');assert.notEqual(attempt.request_id,attempt.parent_request_id);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,2);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_html_deliveries').get().n,1);
 const replay=await s.run();assert.equal(replay.status,202);assert.deepEqual(await replay.json(),body);
 for(const change of [{requestId:crypto.randomUUID()},{requestId:s.oldId}])assert.notEqual((await s.run(change)).status,202);assert.equal(s.posts().length,1);s.unchanged();
 }finally{s.close();}
});
test('missing, inactive, expired, future or wrong-owner permit never reaches GetResponse',async()=>{
 for(const mode of ['flag','missing','inactive','expired','future','wrong_subject','wrong_parent','wrong_id','old_id']){
 const s=await setup();try{
 const env={...s.env};let change={};
 if(mode==='flag')delete env.NEWSLETTER_HTML404_RETRY_ENABLED;
 if(mode==='missing')s.forms.sqlite.exec('DELETE FROM newsletter_retry_permits');
 if(mode==='inactive')s.forms.sqlite.exec('UPDATE newsletter_retry_permits SET active=0');
 if(mode==='expired')s.setClock(new Date((seconds+600)*1000));
 if(mode==='future')s.setClock(new Date((seconds-2)*1000));
 if(mode==='wrong_subject')s.forms.sqlite.exec("UPDATE newsletter_retry_permits SET subject_hash='wrong'");
 if(mode==='wrong_parent')env.NEWSLETTER_HTML404_RETRY_PARENT_ID=crypto.randomUUID();
 if(mode==='wrong_id')change.requestId=crypto.randomUUID();if(mode==='old_id')change.requestId=s.oldId;
 assert.notEqual((await s.run(change,env)).status,202);assert.equal(s.posts().length,0);assert.ok(s.calls.every(c=>c.url.includes('siteverify')));assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_retry_attempts').get().n,0);s.unchanged();
 }finally{s.close();}}
});
test('only an authenticated private allowlisted owner with fresh consent and valid Turnstile can spend the permit',async()=>{
 for(const mode of ['email','origin','auth','public','public_env','api_gate','consent','version','challenge','missing_token']){
 const s=await setup();try{const env={...s.env},change={},headers={};
 if(mode==='email')change.email='someone-else@example.test';if(mode==='origin')headers.Origin='https://cimstudio.es';if(mode==='auth')headers.Authorization='Basic '+btoa('wrong:wrong');if(mode==='public')env.CONTROLLED_TEST_ORIGIN='https://cimstudio.es';if(mode==='public_env')env.SITE_LIVE='true';if(mode==='api_gate')env.NEWSLETTER_API_REVIEWED='false';if(mode==='consent')change.consent=false;if(mode==='version')change.legalVersion='obsolete';if(mode==='challenge')s.mock.challenge=false;if(mode==='missing_token')change.token='';
 assert.notEqual((await s.run(change,env,headers)).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);s.unchanged();
 }finally{s.close();}}
});
test('parent must be HTML 404 with authentic consent, not another status or an API attempt',async()=>{
 for(const mode of ['status','state','api','tampered_consent']){
 const s=await setup();try{
 if(mode==='status')s.forms.sqlite.exec('UPDATE newsletter_html_deliveries SET provider_http_status=403');if(mode==='state')s.forms.sqlite.exec("UPDATE newsletter_html_deliveries SET state='unknown'");
 if(mode==='api')s.forms.sqlite.prepare("INSERT INTO newsletter_api_deliveries VALUES(?,'getresponse-api-v3-request-v1','rejected',404,?)").run(s.oldId,at.toISOString());
 if(mode==='tampered_consent')s.forms.sqlite.prepare("UPDATE newsletter_consent_requests SET consent_text='tampered' WHERE request_id=?").run(s.oldId);
 assert.notEqual((await s.run()).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);
 }finally{s.close();}}
});
test('concurrent use spends the permit once and submits no more than one API POST',async()=>{
 const s=await setup();try{const results=await Promise.all([s.run(),s.run()]);assert.equal(results.filter(r=>r.status===202).length,1);assert.equal(s.posts().length,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_retry_attempts').get().n,1);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,seconds);s.unchanged();}finally{s.close();}
});
test('timeouts on preflight or POST, redirects, 409, 5xx, provider rejections and bad opt-in permanently spend the permission',async()=>{
 for(const mode of ['read_timeout','post_timeout','redirect','conflict','server','rejection','single','existing']){
 const s=await setup();try{
 if(mode==='read_timeout')s.mock.throwAt='campaign';if(mode==='post_timeout')s.mock.throwAt='post';if(mode==='redirect')s.mock.status=302;if(mode==='conflict')s.mock.status=409;if(mode==='server')s.mock.status=503;if(mode==='rejection')s.mock.status=404;if(mode==='single')s.mock.optin='single';if(mode==='existing')s.mock.contacts=[{email:s.data.email,campaign:{campaignId:'PL6jh'}}];
 const first=await s.run();assert.notEqual(first.status,202);const count=s.posts().length;assert.equal(count,['read_timeout','single','existing'].includes(mode)?0:1);
 assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,seconds);await s.run();await s.run({requestId:crypto.randomUUID()});assert.equal(s.posts().length,count);assert.equal(s.forms.sqlite.prepare('SELECT active FROM newsletter_retry_permits').get().active,0);s.unchanged();
 }finally{s.close();}}
});
test('uncertain D1 consumption or a failed attempt insert cannot result in a later provider request',async()=>{
 for(const mode of ['lost_claim_reply','insert','save_result']){const s=await setup();try{
 const prepare=s.env.FORMS_DB.prepare.bind(s.env.FORMS_DB);s.env.FORMS_DB.prepare=sql=>{
 const stmt=prepare(sql);if(mode==='lost_claim_reply'&&sql.startsWith('UPDATE newsletter_retry_permits SET consumed_at')){const first=stmt.first.bind(stmt);stmt.first=async()=>{await first();throw Error('SIMULATED lost D1 reply');};}
 if(mode==='insert'&&sql.startsWith('INSERT INTO newsletter_retry_attempts'))stmt.run=async()=>{throw Error('SIMULATED insert failure');};
 if(mode==='save_result'&&sql.startsWith('UPDATE newsletter_retry_attempts SET state=?'))stmt.run=async()=>{throw Error('SIMULATED result failure');};return stmt;
 };
 assert.notEqual((await s.run()).status,202);assert.equal(s.posts().length,mode==='save_result'?1:0);s.env.FORMS_DB.prepare=prepare;await s.run();assert.equal(s.posts().length,mode==='save_result'?1:0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,seconds);s.unchanged();
 }finally{s.close();}}
});
test('expiry is checked again at atomic claim, after consent recording',async()=>{
 const s=await setup();try{
 const prepare=s.env.FORMS_DB.prepare.bind(s.env.FORMS_DB);s.env.FORMS_DB.prepare=sql=>{const stmt=prepare(sql);if(sql.startsWith('INSERT OR IGNORE INTO newsletter_consent_requests')){const run=stmt.run.bind(stmt);stmt.run=async()=>{const r=await run();s.setClock(new Date((seconds+601)*1000));return r;};}return stmt;};
 assert.notEqual((await s.run()).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);s.unchanged();
 }finally{s.close();}
});
test('permit schema is additive, defaults inactive, enforces short TTL, unique parent and subject, and leaves histories intact',async()=>{
 const s=await setup();try{
 const sql=readFileSync('migrations/0010_newsletter_html404_retry.sql','utf8');s.forms.sqlite.exec(sql);s.forms.sqlite.exec(sql);
 assert.throws(()=>s.forms.sqlite.exec('UPDATE newsletter_retry_permits SET expires_at=issued_at+901'));
 assert.throws(()=>s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits(parent_request_id,api_request_id,subject_hash,issued_at,expires_at,approved_by) VALUES(?,?,?,?,?,?)').run(s.oldId,crypto.randomUUID(),s.evidence.subject_hash,seconds,seconds+600,'CIM Studio'));
 assert.equal(s.forms.sqlite.prepare('PRAGMA quick_check').get().quick_check,'ok');assert.equal(s.forms.sqlite.prepare('PRAGMA foreign_key_check').get(),undefined);s.forms.sqlite.exec('DELETE FROM newsletter_retry_permits');s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits(parent_request_id,api_request_id,subject_hash,issued_at,expires_at,approved_by) VALUES(?,?,?,?,?,?)').run(s.oldId,s.newId,s.evidence.subject_hash,seconds,seconds+600,'CIM Studio');assert.equal(s.forms.sqlite.prepare('SELECT active FROM newsletter_retry_permits').get().active,0);s.unchanged();
 }finally{s.close();}
});
test('private configuration exposes only the assigned new request ID and closes the UI after consumption or expiry',async()=>{
 const s=await setup();try{
 const t=Math.floor(Date.now()/1000);s.forms.sqlite.prepare('UPDATE newsletter_retry_permits SET issued_at=?,expires_at=?').run(t-1,t+600);
 const req=new Request(s.env.CONTROLLED_TEST_ORIGIN+'/api/controlled/newsletter-config',{headers:{Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD)}});
 const first=await newsletterTestConfiguration(req,s.env,policy),body=await first.json();assert.equal(body.enabled,true);assert.equal(body.retryRequestId,s.newId);for(const value of [s.data.email,s.evidence.subject_hash,s.oldId,s.env.GETRESPONSE_API_KEY])assert.ok(!JSON.stringify(body).includes(value));
 s.forms.sqlite.prepare('UPDATE newsletter_retry_permits SET consumed_at=?,active=0').run(t);const closed=await (await newsletterTestConfiguration(req,s.env,policy)).json();assert.equal(closed.enabled,false);assert.equal(closed.retryRequestId,undefined);
 s.forms.sqlite.prepare('UPDATE newsletter_retry_permits SET consumed_at=NULL,active=1,issued_at=?,expires_at=?').run(t-1000,t-500);assert.equal((await (await newsletterTestConfiguration(req,s.env,policy)).json()).enabled,false);
 const unauth=new Request(req.url);assert.equal((await newsletterTestConfiguration(unauth,s.env,policy)).status,401);s.unchanged();
 }finally{s.close();}
});

test('changing the authorised email cannot use exception mode to fall through into a normal signup',async()=>{
 const {newsletterTestEmailHash}=await import('../server/newsletter-test-allowlist.js');const s=await setup();try{
 const email='another-owner@example.test',env={...s.env,NEWSLETTER_TEST_EMAIL_HASH:await newsletterTestEmailHash(s.env.NEWSLETTER_TEST_ALLOWLIST_SECRET,email)};
 assert.notEqual((await s.run({email},env)).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);s.unchanged();
 }finally{s.close();}
});
test('0009 then 0010 create fresh sidecar tables over existing signed HTML 404 evidence without changing it',async()=>{
 const s=await setup();try{
 s.forms.sqlite.exec('DROP TABLE newsletter_retry_attempts; DROP TABLE newsletter_retry_permits; DROP TABLE newsletter_api_deliveries; PRAGMA foreign_keys=ON;');
 for(const file of ['0009_newsletter_api_deliveries.sql','0010_newsletter_html404_retry.sql']){
 const sql=readFileSync('migrations/'+file,'utf8');assert.ok(!/\b(ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql));s.forms.sqlite.exec(sql);s.unchanged();
 }
 for(const table of ['newsletter_api_deliveries','newsletter_retry_permits','newsletter_retry_attempts'])assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 assert.equal(s.forms.sqlite.prepare('PRAGMA quick_check').get().quick_check,'ok');assert.equal(s.forms.sqlite.prepare('PRAGMA foreign_key_check').get(),undefined);
 }finally{s.close();}
});
test('existing runtime UUID guards reject terminal newlines without needing relaxed validation',async()=>{
 const {retryConfigured}=await import('../server/newsletter-html404-retry.js');const s=await setup();try{
 assert.equal(retryConfigured(s.env),true);
 for(const suffix of ['\n','\r','\r\n',' ','\u200b'])assert.equal(retryConfigured({...s.env,NEWSLETTER_HTML404_RETRY_PARENT_ID:s.oldId+suffix}),false);
 s.forms.sqlite.prepare('UPDATE newsletter_retry_permits SET api_request_id=?').run(s.newId+'\n');assert.notEqual((await s.run()).status,202);assert.equal(s.posts().length,0);assert.equal(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at,null);s.unchanged();
 }finally{s.close();}
});
