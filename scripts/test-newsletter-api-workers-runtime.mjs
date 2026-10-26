// Full local workerd flow. Every outbound request is intercepted; SQLite is in memory.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
import {newsletterTestPolicy} from '../server/newsletter-test-policy.js';
import {recordControlledConsent} from '../server/getresponse-controlled.js';
const require=createRequire(import.meta.url),{Miniflare,convertV4MiniflareOptions}=require(process.env.MINIFLARE_MODULE||'miniflare'),esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
for(const mode of ['accepted','rejected','server_error','redirect','existing_contact','historical_html','disabled','retry_accepted','retry_expired','retry_concurrent','retry_5xx']){
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_API_REVIEWED:mode==='disabled'?'false':'true',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true'});s.data.legalVersion=newsletterTestPolicy.version;
 if(mode==='historical_html'||mode.startsWith('retry_')){
 const {evidence}=await recordControlledConsent(s.env,s.data,new Date('2026-10-21T09:00:00Z'),newsletterTestPolicy);
 s.forms.sqlite.prepare("INSERT INTO newsletter_html_deliveries VALUES(?,?,'rejected',404,?,?,?)").run(s.data.requestId,evidence.subject_hash,'2026-10-21T09:00:00Z','2026-10-21T09:00:00Z',0);
 }
 if(mode.startsWith('retry_')){const parent=s.data.requestId,next=crypto.randomUUID(),t=Math.floor(Date.now()/1000),subject=s.forms.sqlite.prepare('SELECT subject_hash FROM newsletter_html_deliveries').get().subject_hash;s.forms.sqlite.prepare('INSERT INTO newsletter_retry_permits(parent_request_id,api_request_id,subject_hash,issued_at,expires_at,approved_by,active) VALUES(?,?,?,?,?,?,1)').run(parent,next,subject,mode==='retry_expired'?t-1000:t-1,mode==='retry_expired'?t-500:t+600,'CIM Studio simulation');Object.assign(s.env,{NEWSLETTER_HTML404_RETRY_ENABLED:'true',NEWSLETTER_HTML404_RETRY_PARENT_ID:parent});s.data.requestId=next;}
 const {FORMS_DB,CAREERS_DB,...env}=s.env;let posts=0,external=0;
 const entry=`import {handleControlledNewsletter} from './server/getresponse-controlled-handler.js';const env=${JSON.stringify(env)};env.FORMS_DB={prepare(sql){let args=[];const rpc=async(method)=>{const r=await fetch('https://simulation-d1.example.test/',{method:'POST',body:JSON.stringify({sql,args,method})});if(!r.ok)throw Error('Simulation database failure');return r.json()};return {sql,args:()=>args,bind(...v){args=v;return this},first(){return rpc('first')},run(){return rpc('run')}}},async batch(statements){const r=await fetch('https://simulation-d1.example.test/',{method:'POST',body:JSON.stringify({method:'batch',statements:statements.map(s=>({sql:s.sql,args:s.args()}))})});if(!r.ok)throw Error('Simulation database failure');return r.json()}};export default {fetch(request){return handleControlledNewsletter(request,env)}};`;
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'simulation-api.mjs'},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'api-simulation',compatibilityDate:'2026-10-19',modules:true,script:bundle.outputFiles[0].text,outboundService:async request=>{
  const url=new URL(request.url);
  if(url.origin==='https://simulation-d1.example.test'){const {sql,args,method,statements}=await request.json();if(method==='batch')return Response.json(await s.forms.db.batch(statements.map(s=>({sql:s.sql,args:()=>s.args}))));assert.ok(['first','run'].includes(method));return Response.json(await s.forms.db.prepare(sql).bind(...args)[method]());}
  external++;
  if(url.href==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return Response.json({success:true,hostname:'cim-studio-test.pages.dev',action:'subscribe'});
  assert.equal(url.origin,'https://api.getresponse.com');assert.equal(request.headers.get('X-Auth-Token'),'api-key '+env.GETRESPONSE_API_KEY);
  if(url.pathname==='/v3/campaigns/PL6jh'){assert.equal(request.method,'GET');return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});}
  assert.equal(url.pathname,'/v3/contacts');
  if(request.method==='GET')return Response.json(mode==='existing_contact'?[{email:s.data.email,campaign:{campaignId:'PL6jh'}}]:[]);
  assert.equal(request.method,'POST');posts++;assert.deepEqual(await request.json(),{email:s.data.email,campaign:{campaignId:'PL6jh'},dayOfCycle:'0',customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']},{customFieldId:'simulation-subscriber-type',value:['particular']}]});
  assert.equal(s.forms.sqlite.prepare('SELECT state FROM '+(mode.startsWith('retry_')?'newsletter_retry_attempts':'newsletter_api_deliveries')).get().state,'sending');if(mode.startsWith('retry_'))assert.ok(s.forms.sqlite.prepare('SELECT consumed_at FROM newsletter_retry_permits').get().consumed_at);
  return new Response(null,{status:mode==='rejected'?404:['server_error','retry_5xx'].includes(mode)?503:mode==='redirect'?302:202,headers:{Location:'https://never-follow.example.test/'}});
 }}]}));
 try{
 const dispatch=data=>mf.dispatchFetch(s.env.CONTROLLED_TEST_ORIGIN+'/api/controlled/subscribe',{method:'POST',headers:{Origin:s.env.CONTROLLED_TEST_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD)},body:JSON.stringify(data)});
 const responses=mode==='retry_concurrent'?await Promise.all([dispatch(s.data),dispatch(s.data)]):[await dispatch(s.data)];const r=responses.find(r=>r.status===202)||responses[0],body=await r.json();
 assert.equal(r.status,['accepted','retry_accepted','retry_concurrent'].includes(mode)?202:['rejected','historical_html'].includes(mode)?502:mode==='disabled'?503:409);if(mode!=='disabled')assert.equal(body.founders,'pending');
 if(['accepted','retry_accepted','retry_concurrent'].includes(mode))assert.equal(body.confirmationVerified,false);
 await dispatch({...s.data,requestId:crypto.randomUUID()});assert.equal(posts,['accepted','rejected','server_error','redirect','retry_accepted','retry_concurrent','retry_5xx'].includes(mode)?1:0);if(mode==='disabled')assert.equal(external,0);
 if(mode.startsWith('retry_'))assert.equal(s.forms.sqlite.prepare('SELECT state FROM newsletter_html_deliveries').get().state,'rejected');
 console.log('PASS workerd API',mode,'simulated POSTs',posts,'no real services contacted');
 }finally{await mf.dispose();s.close();}
}
