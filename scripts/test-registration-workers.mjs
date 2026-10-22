// Local workerd regression for both registrations: every provider/DB access intercepted.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
const require=createRequire(import.meta.url),{Miniflare,convertV4MiniflareOptions}=require(process.env.MINIFLARE_MODULE||'miniflare'),esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
for(const kind of ['samples','careers'])for(const mode of ['accepted','challenge_redirect','mail_redirect']){
 const s=await fixture();Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:'https://cimstudio.es'});const {FORMS_DB,CAREERS_DB,...env}=s.env;let mails=0;
 const data={...(kind==='samples'?s.sample:s.data),legalVersion:'simulation-public-policy'};
 const entry=`import legal from './legal/content.js';import {handleRegistration} from './server/registrations.js';Object.assign(legal,{approved:true,version:'simulation-public-policy'});const env=${JSON.stringify(env)};const store=(name)=>({prepare(sql){let args=[];const rpc=async(method)=>{const r=await fetch('https://simulation-d1.example.test/'+name,{method:'POST',body:JSON.stringify({sql,args,method})});return r.json()};return {sql,args:()=>args,bind(...v){args=v;return this},first(){return rpc('first')},all(){return rpc('all')},run(){return rpc('run')}}},async batch(statements){const r=await fetch('https://simulation-d1.example.test/'+name,{method:'POST',body:JSON.stringify({method:'batch',statements:statements.map(s=>({sql:s.sql,args:s.args()}))})});return r.json()}});env.FORMS_DB=store('forms');env.CAREERS_DB=store('careers');export default {fetch(request){return handleRegistration(request,env,'${kind}')}};`;
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'registration-simulation',compatibilityDate:'2026-10-19',modules:true,script:bundle.outputFiles[0].text,outboundService:async request=>{
 const url=new URL(request.url);
 if(url.hostname==='simulation-d1.example.test'){
 const input=await request.json(),db=url.pathname==='/forms'?s.forms.db:s.careers.db;
 if(input.method==='batch')return Response.json(await db.batch(input.statements.map(v=>({sql:v.sql,args:()=>v.args}))));
 assert.ok(['first','all','run'].includes(input.method));return Response.json(await db.prepare(input.sql).bind(...input.args)[input.method]());
 }
 if(url.href==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return mode==='challenge_redirect'?new Response(null,{status:302,headers:{Location:'https://never-follow.example.test'}}):Response.json({success:true,hostname:'cimstudio.es',action:kind});
 assert.equal(url.href,'https://api.resend.com/emails');assert.equal(request.method,'POST');assert.equal(request.headers.get('Authorization'),'Bearer '+env.RESEND_API_KEY);assert.ok(request.headers.get('Idempotency-Key'));mails++;
 const payload=await request.json();assert.ok(payload.to.length===1);return mode==='mail_redirect'?new Response(null,{status:302,headers:{Location:'https://never-follow.example.test'}}):Response.json({id:'simulation-mail-'+mails});
 }}]}));
 try{
 const r=await mf.dispatchFetch('https://cimstudio.es/api/'+kind,{method:'POST',headers:{Origin:'https://cimstudio.es','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(data)}),body=await r.json();
 assert.equal(r.status,mode==='challenge_redirect'?503:202);assert.equal(mails,mode==='challenge_redirect'?0:kind==='samples'?2:1);
 if(mode!=='challenge_redirect'){assert.equal(body.recorded,true);assert.equal(body.mail,mode==='accepted'?'accepted':'pending');assert.equal(body.confirmationRequired,kind==='careers');}
 console.log('PASS workerd registration',kind,mode,'simulated mail requests',mails,'no real services contacted');
 }finally{await mf.dispose();s.close();}
}
