// Complete local workerd diagnostic: all subrequests intercepted, no providers/remote DB.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fixture,policy} from '../tests/helpers/launch-fixture.mjs';
import {recordControlledConsent} from '../server/getresponse-controlled.js';
const require=createRequire(import.meta.url),{Miniflare,convertV4MiniflareOptions}=require(process.env.MINIFLARE_MODULE||'miniflare'),esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
const at=new Date('2026-10-21T16:00:00Z'),t=Math.floor(at.getTime()/1000);
for(const mode of ['configured_valid','configured_wrong_key','fallback_valid','fallback_wrong_key','fallback_missing','fallback_ambiguous']){
 const s=await fixture();Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'false',NEWSLETTER_HTML404_RETRY_ENABLED:'false',NEWSLETTER_HTML404_RETRY_PARENT_ID:s.data.requestId});
 const {evidence}=await recordControlledConsent(s.env,s.data,at,policy);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(s.data.requestId,evidence.subject_hash,at.toISOString(),at.toISOString(),0);
 s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits VALUES(?,?,?,?,?,?,1,NULL)').run(s.data.requestId,crypto.randomUUID(),evidence.subject_hash,t,t+600,'CIM Studio simulation');
 if(mode==='fallback_ambiguous'){
 const id=crypto.randomUUID(),subject='simulation-other-subject';
 s.forms.sqlite.prepare('INSERT INTO newsletter_consent_requests SELECT ?,?,accepted_at,purpose,language,consent_text,policy_version,custom_field_id,custom_value,encrypted_email,evidence_mac FROM newsletter_consent_requests LIMIT 1').run(id,subject);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,0)").run(id,subject,at.toISOString(),at.toISOString());
 s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits VALUES(?,?,?,?,?,?,1,NULL)').run(id,crypto.randomUUID(),subject,t,t+600,'CIM Studio simulation');
 }
 if(mode==='fallback_missing')s.forms.sqlite.exec('DELETE FROM newsletter_retry_permits');
 if(mode.includes('wrong_key'))s.env.AUDIT_HASH_SECRET='wrong-but-valid-length-key-for-simulation';
 if(mode.startsWith('fallback'))s.env.NEWSLETTER_HTML404_RETRY_PARENT_ID=undefined;
 Object.assign(s.env,{NEWSLETTER_API_REVIEWED:'false',NEWSLETTER_PREPARATION_ENABLED:'false'});
 const {FORMS_DB,CAREERS_DB,...env}=s.env;let reads=0;const changes=s.forms.sqlite.prepare('SELECT total_changes() n').get().n;
 const entry=`import {newsletterDiagnostic} from './server/newsletter-diagnostic.js';const env=${JSON.stringify(env)};env.FORMS_DB={prepare(sql){let args=[];const rpc=async(method)=>{const r=await fetch('https://simulation-d1.example.test',{method:'POST',body:JSON.stringify({sql,args,method})});return r.json()};return {bind(...v){args=v;return this},first(){return rpc('first')},all(){return rpc('all')}}}};export default {fetch(request){return newsletterDiagnostic(request,env,{now:new Date('2026-10-21T16:20:00Z')})}};`;
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'diag',modules:true,compatibilityDate:'2026-10-19',script:bundle.outputFiles[0].text,outboundService:async request=>{assert.equal(new URL(request.url).hostname,'simulation-d1.example.test');const {sql,args,method}=await request.json();assert.match(sql,/^SELECT /);assert.ok(['first','all'].includes(method));reads++;return Response.json(await s.forms.db.prepare(sql).bind(...args)[method]());}}]}));
 try{
 const r=await mf.dispatchFetch(env.CONTROLLED_TEST_ORIGIN+'/api/controlled/newsletter-diagnostic',{headers:{Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD)}}),body=await r.json();
 assert.equal(r.status,200);assert.equal(body.configuration,'invalid');assert.equal(body.d1,'ok');
 const selected=!['fallback_missing','fallback_ambiguous'].includes(mode);
 assert.equal(body.consentHmac,selected?(mode.includes('wrong_key')?'invalid':'valid'):'not_checked');assert.equal(body.permit,selected?'expired':'not_checked');
 if(mode==='fallback_ambiguous')assert.ok(body.failedChecks.includes('RETRY_PARENT_D1_LINK_AMBIGUOUS'));
 if(mode==='fallback_missing')assert.ok(body.failedChecks.includes('RETRY_PARENT_D1_LINK_MISSING'));
 assert.deepEqual(Object.keys(body).sort(),['configuration','failedChecks','d1','consentHmac','permit'].sort());
 for(const secret of [s.data.requestId,s.data.email,s.env.AUDIT_HASH_SECRET])assert.ok(!JSON.stringify(body).includes(secret));
 assert.equal(s.forms.sqlite.prepare('SELECT total_changes() n').get().n,changes);
 console.log('PASS workerd diagnostic',mode,'simulated SELECTs:',reads,'no writes or provider calls');
 }finally{await mf.dispose();s.close();}
}
