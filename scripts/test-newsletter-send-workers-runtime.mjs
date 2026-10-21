// Local-only regression: all outbound requests intercepted, all D1 operations simulated.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=require(process.env.MINIFLARE_MODULE||'miniflare');
const esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
const origin='https://cim-studio-test.pages.dev',key=btoa('l'.repeat(32));
const env={NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_API_KEY:'simulation-api-key',GETRESPONSE_CAMPAIGN_ID:'PL6jh',CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:origin,CONTROLLED_TEST_USER:'simulation-owner',CONTROLLED_TEST_PASSWORD:'simulation-password-at-least-32-characters',NEWSLETTER_TEST_LEGAL_APPROVED:'true',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true',SITE_LIVE:'false',AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-characters',NEWSLETTER_TEST_ALLOWLIST_SECRET:key,NEWSLETTER_TEST_EMAIL_HASH:createHmac('sha256',key).update('newsletter-test-allowlist:v1:owner@example.test').digest('hex'),NEWSLETTER_DATA_KEY:btoa('n'.repeat(32)),TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret'};
for(const mode of ['baseline','fixed_invalid_challenge','fixed_redirect']){
 let reads=0;
 const entry=`import {handleControlledNewsletter} from './server/getresponse-controlled-handler.js';const env=${JSON.stringify(env)};env.FORMS_DB={prepare(sql){if(!sql.includes('form_rate_limits'))throw Error('Evidence/delivery must not be reached');return {bind(){return this},async first(){return {count:1}},async run(){return {}}}}};export default {fetch(request){return handleControlledNewsletter(request,env)}};`;
 const baseline=execFileSync('git',['show','2012120:server/getresponse-controlled-handler.js'],{encoding:'utf8'});
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'simulation.mjs'},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',plugins:mode==='baseline'?[{name:'baseline',setup(build){build.onLoad({filter:/getresponse-controlled-handler\.js$/},()=>({contents:baseline,loader:'js'}))}}]:[]});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'send-probe',compatibilityDate:'2026-10-19',modules:true,script:bundle.outputFiles[0].text,outboundService:async request=>{
  reads++;assert.equal(request.url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(request.method,'POST');
  if(mode==='fixed_redirect')return new Response(null,{status:302,headers:{Location:'https://never-follow.example.test'}});
  return Response.json({success:false});
 }}]}));
 try{
 const r=await mf.dispatchFetch(origin+'/api/controlled/subscribe',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD)},body:JSON.stringify({email:'owner@example.test',consent:true,language:'es',legalVersion:'newsletter-private-test-v1',requestId:'00000000-0000-4000-8000-000000000001',token:'simulation-token',website:''})});
 assert.equal(r.status,mode==='fixed_invalid_challenge'?403:503);assert.equal(reads,mode==='baseline'?0:1);
 console.log('PASS',mode,'status',r.status,'simulated Turnstile calls',reads,'GetResponse calls 0; consent/delivery writes 0');
 }finally{await mf.dispose();}
}
