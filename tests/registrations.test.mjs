import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleRegistration,withdrawCareerConsent,drainRegistrationMail,encryptRegistration,decryptRegistration} from '../server/registrations.js';
import {registrationReady} from '../server/registration-settings.js';
import {legal,publicSettings} from '../server/settings.js';
const original=structuredClone(legal);
afterEach(()=>Object.assign(legal,structuredClone(original)));
function store(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('migrations/0005_registrations.sql','utf8'));sqlite.exec(readFileSync('migrations/0008_launch_operations.sql','utf8'));const db={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}};},_sql:sql,_args:()=>args};},async batch(items){sqlite.exec('BEGIN IMMEDIATE');try{const results=items.map(item=>({results:sqlite.prepare(item._sql).all(...item._args())}));sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};return {sqlite,db};}
function setup(kind='careers'){
 Object.assign(legal,{approved:true,version:'test-only-policy'});
 const forms=store(),careers=store(),env={FORMS_ENABLED:'true',SAMPLES_VERIFIED:'true',CAREERS_VERIFIED:'true',MAIL_RECEIPTS_VERIFIED:'true',SAMPLES_ENABLED:'true',CAREERS_ENABLED:'true',REGISTRATIONS_STORAGE_REVIEWED:'true',FORMS_DB:forms.db,CAREERS_DB:careers.db,SAMPLES_DATA_KEY:btoa('s'.repeat(32)),CAREERS_DATA_KEY:btoa('c'.repeat(32)),REGISTRATION_REVIEW_DAYS:'90',REGISTRATION_ORIGIN:'https://cim.test',TURNSTILE_SITE_KEY:'test-site',TURNSTILE_SECRET_KEY:'test-turnstile',AUDIT_HASH_SECRET:'test-only-audit-secret-12345678901234567',RESEND_API_KEY:'test-no-real-key',MAIL_FROM:'CIM Test <test@example.test>'};
 const data={email:' Person@example.test ',language:'es',consent:true,website:'',token:'test-token',requestId:crypto.randomUUID(),legalVersion:legal.version,...(kind==='samples'?{name:'Professional',company:'Studio',discipline:'architecture',shippingAddress:'Test street 1',postalCode:'00000',city:'Test city',province:'Test region',country:'Test country'}:{})};
 const request=(changes={},headers={})=>new Request('https://cim.test/api/'+kind,{method:'POST',headers:{Origin:'https://cim.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify({...data,...changes})});
 const calls=[],fetcher=async(url,options)=>{calls.push({url,options});if(url.includes('siteverify'))return Response.json({success:true,hostname:'cim.test',action:kind});if(url==='https://api.resend.com/emails')return Response.json({id:'simulation-message-'+calls.length});throw Error('Unexpected external destination');};
 const preferences=(token,action='unsubscribe')=>new Request('https://cim.test/api/careers/unsubscribe',{method:'POST',headers:{Origin:'https://cim.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({token,action})});
 return {forms,careers,env,data,request,calls,fetcher,preferences};
}
test('public registration gates require independent encrypted stores and explicit review, not GetResponse credentials',()=>{
 const s=setup();assert.equal(registrationReady(s.env,'careers',true),true);assert.equal(publicSettings(s.env,new URL('https://cim.test')).enabled.careers,true);
 for(const changes of [{FORMS_ENABLED:'false'},{REGISTRATIONS_STORAGE_REVIEWED:'false'},{CAREERS_DB:s.env.FORMS_DB},{CAREERS_DATA_KEY:s.env.SAMPLES_DATA_KEY},{CAREERS_DATA_KEY:'bad'},{REGISTRATION_ORIGIN:'http://cim.test'},{REGISTRATION_REVIEW_DAYS:''}])assert.equal(registrationReady({...s.env,...changes},'careers',true),false);
 const publicData=JSON.stringify(publicSettings(s.env,new URL('https://cim.test')));for(const key of ['SAMPLES_DATA_KEY','CAREERS_DATA_KEY','RESEND_API_KEY'])assert.ok(!publicData.includes(s.env[key]));
});
test('career consent and pending contact commit before receipt, with encrypted data and no commercial contact',async()=>{
 const s=setup();const r=await handleRegistration(s.request(),s.env,'careers',s.fetcher);assert.equal(r.status,202);assert.equal((await r.json()).mail,'accepted');
 const row=s.careers.sqlite.prepare('SELECT * FROM registrations').get();assert.equal(row.state,'pending');assert.equal(row.kind,'careers');assert.equal(row.confirmed_at,null);assert.ok(!JSON.stringify(row).includes('person@example.test'));assert.match(row.consent_text,/oportunidades profesionales/);
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.ok(s.calls.every(x=>!x.url.includes('getresponse')));
 assert.equal(s.careers.sqlite.prepare('SELECT event FROM registration_consent_events').get().event,'granted');
 assert.equal(s.careers.sqlite.prepare('SELECT encrypted_payload FROM registration_mail').get().encrypted_payload,null);
});
test('email-owner confirmation and withdrawal are explicit, idempotent and isolated from Founders',async()=>{
 const s=setup();await handleRegistration(s.request(),s.env,'careers',s.fetcher);
 const message=JSON.parse(s.calls.find(x=>x.url.includes('resend')).options.body);const token=message.text.match(/preferences\/#([a-f0-9]{64})/)[1];
 assert.equal((await withdrawCareerConsent(new Request('https://cim.test/api/careers/unsubscribe'),s.env)).status,405);
 assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');
 assert.equal((await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,s.fetcher)).status,200);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');
 await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,s.fetcher);assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_consent_events WHERE event='confirmed'").get().n,1);
 const disabled={...s.env,CAREERS_ENABLED:'false',FORMS_ENABLED:'false'};
 assert.equal((await withdrawCareerConsent(s.preferences(token),disabled)).status,200);assert.equal((await withdrawCareerConsent(s.preferences(token),disabled)).status,200);
 const row=s.careers.sqlite.prepare('SELECT * FROM registrations').get();assert.equal(row.state,'withdrawn');assert.equal(row.encrypted_data,null);
 assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_consent_events WHERE event='withdrawn'").get().n,1);
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
});
test('renewed career consent rotates link, preserves history and blocks an old withdrawal token',async()=>{
 const s=setup();await handleRegistration(s.request(),s.env,'careers',s.fetcher);const first=JSON.parse(s.calls.find(x=>x.url.includes('resend')).options.body).text.match(/preferences\/#([a-f0-9]{64})/)[1];await withdrawCareerConsent(s.preferences(first),s.env);
 await handleRegistration(s.request({requestId:crypto.randomUUID(),language:'en'}),s.env,'careers',s.fetcher);
 await withdrawCareerConsent(s.preferences(first),s.env);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
 assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_consent_events WHERE event='granted'").get().n,2);
 assert.match(JSON.parse(s.calls.filter(x=>x.url.includes('resend')).at(-1).options.body).text,/Confirm my email address/);
});
test('samples persist all current fields and send separate admin/receipt emails exactly once',async()=>{
 const s=setup('samples');assert.equal((await handleRegistration(s.request(),s.env,'samples',s.fetcher)).status,202);
 const emails=s.calls.filter(x=>x.url.includes('resend')).map(x=>JSON.parse(x.options.body));assert.equal(emails.length,2);assert.deepEqual(emails[0].to,['admin@cimstudio.es']);assert.match(emails[0].text,/Studio/);assert.match(emails[0].text,/Test street 1/);assert.deepEqual(emails[1].to,['person@example.test']);assert.match(emails[1].text,/Datos correctos/);assert.ok(emails[1].text.includes('Test street 1'));assert.equal(emails[1].reply_to,'admin@cimstudio.es');assert.ok(emails[1].html.includes('Test street 1'));assert.equal(emails[0].reply_to,'person@example.test');
 assert.equal((await handleRegistration(s.request(),s.env,'samples',s.fetcher)).status,202);assert.equal(s.calls.filter(x=>x.url.includes('resend')).length,2);
 assert.equal((await handleRegistration(s.request({shippingAddress:'tampered'}),s.env,'samples',s.fetcher)).status,409);
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);assert.ok(!JSON.stringify(s.forms.sqlite.prepare('SELECT * FROM registrations').get()).includes('Test street 1'));
});
test('ambiguous receipt failure retains a saved request, reports pending mail and is never blindly retried',async()=>{
 const s=setup();let mail=0;const fail=async(url,options)=>{if(url.includes('resend')){mail++;throw Error('Provider timeout containing personal data');}return s.fetcher(url,options);};
 const response=await handleRegistration(s.request(),s.env,'careers',fail);assert.equal(response.status,202);assert.equal((await response.json()).mail,'pending');assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');assert.equal(s.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'unknown');
 await drainRegistrationMail(s.env,'careers',fail);await handleRegistration(s.request({requestId:crypto.randomUUID()}),s.env,'careers',fail);assert.equal(mail,1);
});
test('definite provider rate limit is retryable and acceptance purges encrypted receipt',async()=>{
 const s=setup();let attempt=0;const limited=async(url,options)=>{if(url.includes('resend')&&attempt++===0)return new Response(null,{status:429});return s.fetcher(url,options);};
 const now=new Date('2026-10-20T08:00:00Z');await handleRegistration(s.request(),s.env,'careers',limited,now);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'pending');
 await drainRegistrationMail(s.env,'careers',limited,new Date(now.getTime()+61000));assert.equal(s.careers.sqlite.prepare('SELECT state FROM registration_mail').get().state,'accepted');assert.equal(s.careers.sqlite.prepare('SELECT encrypted_payload FROM registration_mail').get().encrypted_payload,null);
});
test('validation, same-origin, stale consent, real-purpose store separation and Turnstile failures never store a contact',async()=>{
 const s=setup();for(const changes of [{consent:false},{legalVersion:'old'},{website:'bot'},{email:'bad'},{requestId:'-'.repeat(36)}])assert.equal((await handleRegistration(s.request(changes),s.env,'careers',s.fetcher)).status,400);
 assert.equal((await handleRegistration(s.request({}, {Origin:'https://attacker.test'}),s.env,'careers',s.fetcher)).status,403);
 assert.equal((await handleRegistration(s.request(),s.env,'careers',async()=>Response.json({success:true,hostname:'cim.test',action:'samples'}))).status,403);
 assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
 s.careers.sqlite.exec("INSERT OR IGNORE INTO registration_store VALUES(1,'careers')");assert.equal((await handleRegistration(s.request(),{...s.env,CAREERS_DB:s.forms.db,FORMS_DB:s.careers.db},'careers',s.fetcher)).status,202);
 // The previously careers-marked database cannot be reused for samples, even via a different alias.
 const t=setup('samples');t.forms.sqlite.exec("INSERT INTO registration_store VALUES(1,'careers')");assert.equal((await handleRegistration(t.request(),t.env,'samples',t.fetcher)).status,503);
});
test('storage transaction failure never claims registration or sends receipt; unknown provider payload does not leak',async()=>{
 const s=setup();s.env.CAREERS_DB={...s.careers.db,async batch(){throw Error('private storage error');}};
 const response=await handleRegistration(s.request(),s.env,'careers',s.fetcher);assert.equal(response.status,503);assert.equal(s.calls.filter(x=>x.url.includes('resend')).length,0);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
});
test('concurrent career attempts create one pending owner-confirmation and one receipt',async()=>{
 const s=setup();const responses=await Promise.all([handleRegistration(s.request(),s.env,'careers',s.fetcher),handleRegistration(s.request({requestId:crypto.randomUUID()}),s.env,'careers',s.fetcher)]);
 assert.ok(responses.every(r=>r.status===202));assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);assert.equal(s.careers.sqlite.prepare('SELECT COUNT(*) n FROM registration_mail').get().n,1);assert.equal(s.calls.filter(x=>x.url.includes('resend')).length,1);
});
test('public acquisition remains disabled without verification, unless an explicitly restricted test is authorized',()=>{
 const s=setup();const disabled={...s.env,CAREERS_VERIFIED:'false',MAIL_RECEIPTS_VERIFIED:'false'};
 assert.equal(registrationReady(disabled,'careers',true),false);
 assert.equal(registrationReady({...disabled,CONTROLLED_TEST_MODE:'true',REGISTRATIONS_TEST_ENABLED:'true',CONTROLLED_TEST_ORIGIN:s.env.REGISTRATION_ORIGIN},'careers',true),true);
 assert.equal(registrationReady({...disabled,CONTROLLED_TEST_MODE:'true',REGISTRATIONS_TEST_ENABLED:'true',CONTROLLED_TEST_ORIGIN:'https://elsewhere.test'},'careers',true),false);
});
test('rate limiting and invalid/untrusted withdrawal requests cannot change a registration',async()=>{
 const s=setup();for(let i=0;i<8;i++)assert.equal((await handleRegistration(s.request(),s.env,'careers',s.fetcher)).status,202);
 assert.equal((await handleRegistration(s.request(),s.env,'careers',s.fetcher)).status,429);assert.equal(s.calls.filter(x=>x.url.includes('resend')).length,1);
 assert.equal((await withdrawCareerConsent(s.preferences('a'.repeat(64)),s.env)).status,200);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');
 assert.equal((await withdrawCareerConsent(s.preferences('bad'),s.env)).status,400);
});
test('registration Turnstile and transactional mail use manual redirects and fail closed on 3xx',async()=>{
 for(const kind of ['samples','careers'])for(const stage of ['challenge','mail']){
 const s=setup(kind);try{let mails=0;const response=await handleRegistration(s.request(),s.env,kind,async(url,options)=>{
 assert.equal(options.redirect,'manual');
 if(url.includes('siteverify'))return stage==='challenge'?new Response(null,{status:302,headers:{Location:'https://never-follow.example.test'}}):Response.json({success:true,hostname:'cim.test',action:kind});
 assert.equal(url,'https://api.resend.com/emails');mails++;return new Response(null,{status:302,headers:{Location:'https://never-follow.example.test'}});
 });assert.equal(response.status,stage==='challenge'?503:202);if(stage==='challenge')assert.equal(mails,0);
 }finally{s.forms.sqlite.close();s.careers.sqlite.close();}}
});

test('mail worker disabled does not prevent immediate samples and careers delivery; acceptance is not delivery',async()=>{
 for(const kind of ['samples','careers']){
  const s=setup(kind);s.env.MAIL_WORKER_ENABLED='false';
  const response=await handleRegistration(s.request(),s.env,kind,s.fetcher),body=await response.json();
  assert.equal(body.recorded,true);assert.equal(body.mailState,'accepted');assert.equal(body.deliveryVerified,false);
  assert.equal(s.calls.filter(call=>call.url==='https://api.resend.com/emails').length,kind==='samples'?2:1);
 }
});
test('mail outcome distinguishes rejected, uncertain, rate-limited and missing jobs without resubmitting',async()=>{
 for(const [status,state] of [[403,'rejected'],[422,'rejected'],[500,'uncertain'],[429,'pending']]){
  const s=setup();let sends=0;
  const fetcher=(url,options)=>{if(url.includes('resend')){sends++;return Promise.resolve(new Response(null,{status}));}return s.fetcher(url,options);};
  const body=await(await handleRegistration(s.request(),s.env,'careers',fetcher)).json();
  assert.equal(body.recorded,true);assert.equal(body.mailState,state);assert.equal(body.mail,'pending');assert.equal(body.deliveryVerified,false);
  const replay=await(await handleRegistration(s.request(),s.env,'careers',fetcher)).json();
  assert.equal(replay.mailState,state);assert.equal(sends,1);
  // No mail job is not proof of a successful mail operation.
  s.careers.sqlite.exec('DELETE FROM registration_mail');
  const missing=await(await handleRegistration(s.request(),s.env,'careers',fetcher)).json();
  assert.equal(missing.mailState,'pending');assert.equal(sends,1);
 }
});
test('partial samples acceptance is not reported as complete provider acceptance',async()=>{
 const s=setup('samples');let sends=0;
 const fetcher=(url,options)=>url.includes('resend')?Promise.resolve(++sends===1?Response.json({id:'simulation-admin'}):new Response(null,{status:403})):s.fetcher(url,options);
 const body=await(await handleRegistration(s.request(),s.env,'samples',fetcher)).json();
 assert.equal(body.mailState,'rejected');assert.equal(body.mail,'pending');assert.equal(body.recorded,true);assert.equal(body.deliveryVerified,false);
 assert.deepEqual(s.forms.sqlite.prepare('SELECT state FROM registration_mail ORDER BY state').all().map(row=>row.state),['accepted','rejected']);
});

test('career administrative notification is sent only on confirmation, with minimal data and no duplicated delivery',async()=>{
 const s=setup();s.env.MAIL_WORKER_ENABLED='false';
 await handleRegistration(s.request(),s.env,'careers',s.fetcher);
 assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,1);
 const mail=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body),token=mail.text.match(/preferences\/#([a-f0-9]{64})/)[1];
 const now=new Date('2026-10-22T10:00:00Z');
 const results=await Promise.all([withdrawCareerConsent(s.preferences(token,'confirm'),s.env,now,null,s.fetcher),withdrawCareerConsent(s.preferences(token,'confirm'),s.env,now,null,s.fetcher)]);
 assert.ok(results.every(r=>r.status===200));
 await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,now,null,s.fetcher);
 const jobs=s.calls.filter(c=>c.url.includes('resend')).map(c=>JSON.parse(c.options.body));
 assert.equal(jobs.length,2);assert.deepEqual(jobs[1].to,['admin@cimstudio.es']);assert.match(jobs[1].text,/person@example.test/);assert.ok(!jobs[1].text.includes(token));assert.ok(!jobs[1].text.includes('career-unsubscribe'));
 assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_mail WHERE id LIKE '%:confirmed-admin'").get().n,1);
 assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_consent_events WHERE event='confirmed'").get().n,1);
});
test('failed confirmation notification remains durable without repeating recipient mail or retrying unknown delivery',async()=>{
 const s=setup();await handleRegistration(s.request(),s.env,'careers',s.fetcher);
 const token=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body).text.match(/preferences\/#([a-f0-9]{64})/)[1];let sends=0;
 const fail=async()=>{sends++;throw Error('simulation mail uncertainty');};
 assert.equal((await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,fail)).status,200);
 assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');
 assert.equal(s.careers.sqlite.prepare("SELECT state FROM registration_mail WHERE id LIKE '%:confirmed-admin'").get().state,'unknown');
 await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,fail);assert.equal(sends,1);
});
test('notification persistence failure rolls back confirmation and audit without sending mail',async()=>{
 const s=setup();await handleRegistration(s.request(),s.env,'careers',s.fetcher);
 const token=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body).text.match(/preferences\/#([a-f0-9]{64})/)[1];
 s.careers.sqlite.exec("CREATE TRIGGER fail_admin BEFORE INSERT ON registration_mail WHEN NEW.id LIKE '%:confirmed-admin' BEGIN SELECT RAISE(ABORT,'simulated persistence failure'); END");
 const response=await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,s.fetcher);
 assert.equal(response.status,503);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');
 assert.equal(s.careers.sqlite.prepare("SELECT COUNT(*) n FROM registration_consent_events WHERE event='confirmed'").get().n,0);
 assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,1);
});

test('confirming careers drains only the new admin job, never an older pending receipt',async()=>{
 const s=setup();await handleRegistration(s.request(),s.env,'careers',s.fetcher);
 const token=JSON.parse(s.calls.find(c=>c.url.includes('resend')).options.body).text.match(/preferences\/#([a-f0-9]{64})/)[1];
 s.careers.sqlite.exec("UPDATE registration_mail SET state='pending' WHERE id LIKE '%:receipt'");
 await withdrawCareerConsent(s.preferences(token,'confirm'),s.env,new Date(),null,s.fetcher);
 assert.equal(s.careers.sqlite.prepare("SELECT state FROM registration_mail WHERE id LIKE '%:receipt'").get().state,'pending');
 assert.equal(s.careers.sqlite.prepare("SELECT state FROM registration_mail WHERE id LIKE '%:confirmed-admin'").get().state,'accepted');
 assert.equal(s.calls.filter(c=>c.url.includes('resend')).length,2);
});

test('shipping samples validate all five address fields and five sectors, and omit the old project field',async()=>{
 for(const field of ['shippingAddress','postalCode','city','province','country']){
  const s=setup('samples');const changes={[field]:''};
  assert.equal((await handleRegistration(s.request(changes),s.env,'samples',s.fetcher)).status,400);assert.equal(s.calls.length,0);
 }
 for(const discipline of ['interior-design','architecture','hospitality','gastronomy','other']){
  const s=setup('samples');assert.equal((await handleRegistration(s.request({discipline}),s.env,'samples',s.fetcher)).status,202);
 }
 const s=setup('samples');for(const changes of [{shippingAddress:'x'.repeat(251)},{postalCode:'x'.repeat(21)},{city:'x'.repeat(121)},{province:'x'.repeat(121)},{country:'x'.repeat(101)},{country:'Test\nInjected'},{discipline:'invalid'}])assert.equal((await handleRegistration(s.request(changes),s.env,'samples',s.fetcher)).status,400);
});
test('new sample address is encrypted, included in admin and applicant mail, and legacy encrypted projects remain intact',async()=>{
 const s=setup('samples');await handleRegistration(s.request(),s.env,'samples',s.fetcher);
 const old=s.forms.sqlite.prepare('SELECT * FROM registrations').get();
 const legacy={email:'person@example.test',name:'Legacy professional',company:'Legacy studio',discipline:'architecture',project:'Historical project - preserve'};
 const oldCipher=await encryptRegistration(s.env,'samples',old.id,legacy);
 s.forms.sqlite.prepare('UPDATE registrations SET encrypted_data=? WHERE id=?').run(oldCipher,old.id);
 const snapshot=s.forms.sqlite.prepare('SELECT * FROM registrations WHERE id=?').get(old.id);
 const r=await handleRegistration(s.request({requestId:crypto.randomUUID(),shippingAddress:'New test address 2',discipline:'gastronomy'}),s.env,'samples',s.fetcher);assert.equal(r.status,202);
 assert.deepEqual(s.forms.sqlite.prepare('SELECT * FROM registrations WHERE id=?').get(old.id),snapshot);
 assert.deepEqual(await decryptRegistration(s.env,'samples',old.id,oldCipher),legacy);
 const recent=s.forms.sqlite.prepare('SELECT * FROM registrations WHERE id!=?').get(old.id);
 const clear=await decryptRegistration(s.env,'samples',recent.id,recent.encrypted_data);assert.equal(clear.version,2);assert.equal(clear.shippingAddress,'New test address 2');assert.equal(clear.postalCode,'00000');assert.ok(!Object.hasOwn(clear,'project'));
 assert.ok(!recent.encrypted_data.includes('New test address 2'));
 const mails=s.calls.filter(call=>call.url.includes('resend')).slice(-2).map(call=>JSON.parse(call.options.body));
 for(const value of ['New test address 2','00000','Test city','Test region','Test country','Gastronomía y restauración'])assert.ok(mails[0].text.includes(value));
 assert.ok(mails[1].text.includes('New test address 2'));assert.ok(!mails[0].text.includes('Proyecto:'));
});
