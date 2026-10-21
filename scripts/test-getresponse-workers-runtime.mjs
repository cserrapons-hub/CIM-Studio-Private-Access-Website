// No real API calls. workerd runs locally; every outbound request is replaced.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=require(process.env.MINIFLARE_MODULE||'miniflare');
const esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
const origin='https://cim-studio-test.pages.dev';
const source=execFileSync('git',['show','2521ece:server/getresponse-newsletter.js'],{encoding:'utf8'}).replace(/^export /gm,'');
for(const date of ['2024-01-01','2026-10-19']){
 let reads=0;
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'old-probe',compatibilityDate:date,modules:true,script:source+`\nexport default {async fetch(){try{await verifyNewsletter('simulation-key','PL6jh');return Response.json({ok:true});}catch(e){return Response.json({code:e.code});}}};`,outboundService:async()=>{reads++;return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});}}]}));
 try{const r=await mf.dispatchFetch('https://local.example.test');assert.equal((await r.json()).code,'campaign_network');assert.equal(reads,0);console.log('PASS baseline 2521ece:',date,'fails before any outgoing request.');}finally{await mf.dispose();}
}
const key=Buffer.from('l'.repeat(32)).toString('base64');
const env={CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:origin,CONTROLLED_TEST_USER:'simulation-owner',CONTROLLED_TEST_PASSWORD:'simulation-password-at-least-32-characters',NEWSLETTER_TEST_LEGAL_APPROVED:'true',NEWSLETTER_OBSERVATIONS_ENABLED:'true',NEWSLETTER_PREPARATION_ENABLED:'false',NEWSLETTER_CONTROLLED_SEND_ENABLED:'false',SITE_LIVE:'false',GETRESPONSE_API_KEY:'simulation-key',GETRESPONSE_CAMPAIGN_ID:'PL6jh',AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-characters',NEWSLETTER_TEST_ALLOWLIST_SECRET:key,NEWSLETTER_TEST_EMAIL_HASH:createHmac('sha256',key).update('newsletter-test-allowlist:v1:owner@example.test').digest('hex')};
for(const mode of ['success','campaign_redirect','contacts_redirect','bad_header']){
 const testEnv={...env,...(mode==='bad_header'?{GETRESPONSE_API_KEY:'simulation\r\nPRIVATE'}:{})};
 const entry=`import {observeNewsletter} from './server/newsletter-observations.js';\nlet writes=0;const env=${JSON.stringify(testEnv)};env.FORMS_DB={prepare(sql){return {bind(){return this},async first(){return sql.includes('COUNT(*)')?{n:0}:null},async run(){if(sql.startsWith('INSERT INTO newsletter_observations'))writes++;return {}}}}};export default {async fetch(request){const r=await observeNewsletter(request,env);return Response.json({...await r.json(),simulationWrites:writes},{status:r.status});}};`;
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'simulation-worker.mjs'},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
 let reads=0;
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'fixed-probe',compatibilityDate:'2026-10-19',modules:true,script:bundle.outputFiles[0].text,outboundService:async request=>{
  reads++;const url=new URL(request.url);assert.equal(url.origin,'https://api.getresponse.com');assert.equal(request.method,'GET');assert.equal(request.headers.get('X-Auth-Token'),'api-key simulation-key');
  if(mode==='campaign_redirect'||mode==='contacts_redirect'&&url.pathname==='/v3/contacts')return new Response(null,{status:302,headers:{Location:'https://must-not-be-contacted.example.test/private'}});
  if(url.pathname==='/v3/campaigns/PL6jh')return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
  assert.equal(url.pathname,'/v3/contacts');assert.equal(url.searchParams.get('query[campaignId]'),'PL6jh');return Response.json([]);
 }}]}));
 try{
  const response=await mf.dispatchFetch(origin+'/api/controlled/newsletter-observation',{method:'POST',headers:{Origin:origin,Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD),'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',phase:'before'})}),body=await response.json();
  if(mode==='success'){assert.equal(response.status,200);assert.equal(body.simulationWrites,1);assert.equal(reads,2);assert.equal(body.observation.founders,'pending');assert.equal(body.observation.confirmationVerified,false);}
  else{assert.equal(response.status,503);assert.equal(body.diagnostic.code,mode==='bad_header'?'campaign_request':mode);assert.equal(body.simulationWrites,0);assert.equal(reads,mode==='bad_header'?0:mode==='campaign_redirect'?1:2);}
  console.log('PASS fixed workerd flow:',mode,'intercepted GETs:',reads,'simulated writes:',body.simulationWrites);
 }finally{await mf.dispose();}
}
console.log('PASS 6 workerd cases. No DNS/TLS/provider connections or real D1 writes.');
