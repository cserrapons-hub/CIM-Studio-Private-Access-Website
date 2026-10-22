// Future public newsletter UI tested ONLY with a simulated release contract and providers.
// Real source release/legal approvals remain false. All browser requests are intercepted.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,policy} from '../tests/helpers/launch-fixture.mjs';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import legal from '../legal/content.js';
import {newsletterRelease} from '../server/newsletter-release.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const origin='https://cimstudio.es',profile={approved:true,version:'SIMULATION-ONLY',provider:'getresponse-api-v3',acceptedResponse:{status:202}};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of ['accepted','rejected','unknown']){
  const s=await fixture(),context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500}),errors=[];let sends=0,posts=0;
  Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_ENABLED:'true',NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:origin});
  try{
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
    assert.equal(url.origin,origin,'Unexpected external request');
    if(url.pathname==='/api/config')return route.fulfill({contentType:'application/json',body:JSON.stringify({enabled:{subscribe:true,samples:false,careers:false},siteKey:'simulation-site',verified:false,siteLive:false,legalVersion:policy.version,legal:null})});
    if(url.pathname==='/api/subscribe'){
     posts++;const request=new Request(r.url(),{method:'POST',headers:{...r.headers(),'CF-Connecting-IP':'192.0.2.1'},body:r.postData()});
     const response=await handlePublicNewsletter(request,s.env,{policy,profile,fetcher:async(target)=>{
      if(target.includes('siteverify'))return Response.json({success:true,hostname:'cimstudio.es',action:'subscribe'});
      if(target.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});if(target.includes('/contacts?'))return Response.json([]);assert.equal(target,'https://api.getresponse.com/v3/contacts');sends++;
      return new Response('SIMULATED ONLY',{status:scenario==='rejected'?422:scenario==='unknown'?302:202,headers:{Location:scenario==='unknown'?'https://provider.example.test/unknown':'https://never-follow.example.test'}});
     }});
     return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
    }
    const relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
    return route.fulfill({contentType:relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.html')?'text/html':'application/octet-stream',body:readFileSync(root+'public/'+relative)});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.waitForFunction(()=>window.cimFormSettings);
   await page.locator('[data-lang='+lang+']').click();await page.locator('[data-open=subscribe-dialog]').click();await page.waitForFunction(()=>window.turnstile);
   await page.locator('#email').fill('owner@example.test');assert.equal(await page.locator('[name=marketing_consent]').isChecked(),false);
   await page.locator('#subscribe-dialog [type=submit]').click();assert.equal(posts,0);
   await page.locator('[name=marketing_consent]').check();await page.locator('#subscribe-dialog [type=submit]').click();
   if(scenario==='accepted'){
    try{await page.waitForFunction(()=>document.getElementById('subscription-pending-dialog').open,{},{timeout:8000});}catch(error){console.log({scenario,width,lang,posts,sends,message:await page.locator('#subscribe-dialog .status').getAttribute('data-message'),errors});throw error;}
    assert.equal(await page.locator('#subscribe-dialog').evaluate(e=>e.open),false);
    assert.match(await page.locator('#subscription-pending-dialog').textContent(),lang==='es'?/confirmes tu correo/:/confirm your email/);
   }else{
    await page.waitForFunction(expected=>document.querySelector('#subscribe-dialog .status').dataset.message===expected,scenario==='unknown'?'pending':'unavailable');
    assert.equal(await page.locator('#subscription-pending-dialog').evaluate(e=>e.open),false);
   }
   assert.equal(sends,1);assert.equal(posts,1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.equal(legal.approved,false);assert.equal(newsletterRelease.approved,false);count++;
  }finally{await context.close();s.close();}
 }
 console.log('PASS '+count+' future-public UI cases: ES/EN desktop/mobile, mandatory unchecked consent, simulated accepted/rejected/unknown responses and conditional DOI modal. All providers intercepted; actual release/legal gates remain false.');
}finally{await browser.close();}
