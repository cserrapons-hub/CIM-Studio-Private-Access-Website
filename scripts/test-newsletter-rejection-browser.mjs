// All browser/provider traffic intercepted; in-memory D1 only. No real submissions.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,policy} from '../tests/helpers/launch-fixture.mjs';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {newsletterTestConfiguration} from '../functions/api/controlled/newsletter-config.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const mode of ['rejected','accepted'])for(const lang of ['es','en'])for(const width of [1440,390]){
 const s=await fixture();Object.assign(s.env,{NEWSLETTER_API_REVIEWED:'true',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true'});
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();let posts=0;
 try{
 await context.route('**/*',async route=>{
  const r=route.request(),url=new URL(r.url());
  if(url.origin==='https://challenges.cloudflare.com'){assert.equal(url.pathname,'/turnstile/v0/api.js');return route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:()=>1,getResponse:()=>"simulation-token",reset:()=>{},remove:()=>{}};window.cimPrivateNewsletterTurnstileReady();'});}
  assert.equal(url.origin,s.env.CONTROLLED_TEST_ORIGIN);
  let response;
  const headers={...r.headers(),origin:s.env.CONTROLLED_TEST_ORIGIN,'CF-Connecting-IP':'192.0.2.1',Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD)};
  const req=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}:{})});
  if(url.pathname==='/api/controlled/newsletter-config')response=await newsletterTestConfiguration(req,s.env,policy);
  else if(url.pathname==='/api/controlled/subscribe')response=await handleControlledNewsletter(req,s.env,{policy,fetcher:async(target,options)=>{
   if(target.includes('siteverify'))return s.fetcher(target,options);
   if(target.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
   if(target.includes('/contacts?'))return Response.json([]);
   assert.equal(target,'https://api.getresponse.com/v3/contacts');posts++;return new Response('PRIVATE PROVIDER CONTENT',{status:mode==='accepted'?202:404});
  }});
  else{const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;response=new Response(readFileSync('public'+path),{headers:{'Content-Type':path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html'}});}
  return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
 });
 await page.goto(s.env.CONTROLLED_TEST_ORIGIN+'/controlled/newsletter/');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 if(lang==='en')await page.click('[data-lang=en]');
 await page.fill('[name=email]',s.data.email);await page.check('[name=consent]');await page.click('[type=submit]');
 await page.waitForFunction(()=>document.getElementById('result').textContent.includes('GetResponse'));
 assert.match(await page.locator('#result').textContent(),mode==='accepted'?(lang==='es'?/ha aceptado/:/accepted/):(lang==='es'?/ha rechazado/:/rejected/));assert.equal(posts,1);assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);count++;
 }finally{await context.close();s.close();}
}console.log('PASS',count,'ES/EN desktop/mobile acceptance/rejection cases, no real provider calls.');}finally{await browser.close();}
