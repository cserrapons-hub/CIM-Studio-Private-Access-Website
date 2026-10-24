// Public newsletter UI, using intercepted requests and simulated providers only.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,policy} from '../tests/helpers/launch-fixture.mjs';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import legal from '../legal/content.js';
import {newsletterRelease} from '../server/newsletter-release.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const approvals=[legal.approved,newsletterRelease.approved],origin='https://cimstudio.es';
const profile={approved:true,version:'SIMULATION-ONLY',provider:'getresponse-api-v3',acceptedResponse:{status:202}};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
const dimensions=new Map();let count=0;
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of ['accepted','repeated','existing','generic','unknown','rejected','unavailable','network','challenge','rate']){
  const s=await fixture(),context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500}),errors=[];let sends=0,posts=0;
  Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_ENABLED:'true',NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:origin});
  const fetcher=async(target,options)=>{
   if(target.includes('siteverify'))return Response.json({success:scenario!=='challenge',hostname:'cimstudio.es',action:'subscribe'});
   if(target.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
   if(target.includes('/contacts?'))return Response.json(scenario==='existing'?[{email:'owner@example.test',campaign:{campaignId:'PL6jh'}}]:[]);
   assert.equal(target,'https://api.getresponse.com/v3/contacts');sends++;
   assert.equal(JSON.parse(options.body).customFieldValues.find(field=>field.customFieldId===s.env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID).value[0],lang==='en'?'profesional':'particular');
   return new Response('SIMULATED ONLY',{status:scenario==='rejected'?422:scenario==='unknown'?302:202});
  };
  try{
   if(scenario==='repeated'){
    const prior=new Request(origin+'/api/subscribe',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({...s.data,language:lang,subscriberType:lang==='en'?'profesional':'particular'})});
    assert.equal((await handlePublicNewsletter(prior,s.env,{policy,profile,fetcher,logger:()=>{}})).status,202);assert.equal(sends,1);sends=0;
   }
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
    assert.equal(url.origin,origin,'Unexpected external request');
    if(url.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:true,samples:false,careers:false},siteKey:'simulation-site',verified:false,siteLive:false,legalVersion:policy.version,legal:null}});
    if(url.pathname==='/api/subscribe'){
     posts++;
     if(scenario==='network')return route.abort('failed');
     if(scenario==='generic')return route.fulfill({status:202,json:{ok:true,subscription:'request_recorded'}});
     if(scenario==='unavailable'||scenario==='rate')return route.fulfill({status:scenario==='rate'?429:503,json:{error:scenario==='rate'?'rate':'unavailable'}});
     const request=new Request(r.url(),{method:'POST',headers:{...r.headers(),'CF-Connecting-IP':'192.0.2.1'},body:r.postData()});
     const response=await handlePublicNewsletter(request,s.env,{policy,profile,fetcher,logger:()=>{}});
     return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
    }
    const relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
    return route.fulfill({contentType:relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.html')?'text/html':'application/octet-stream',body:readFileSync(root+'public/'+relative)});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.waitForFunction(()=>window.cimFormSettings);
   await page.locator('[data-lang='+lang+']').click();await page.locator('[data-open=subscribe-dialog]').click();await page.waitForFunction(()=>window.turnstile);
   assert.equal(await page.locator('#subscriber-type').inputValue(),'');await page.locator('#email').fill('owner@example.test');await page.locator('[name=marketing_consent]').check();await page.locator('#subscribe-dialog [type=submit]').click();assert.equal(posts,0,'Audience is mandatory');await page.locator('[name=marketing_consent]').uncheck();
   await page.selectOption('#subscriber-type',lang==='en'?'profesional':'particular');await page.locator('#subscribe-dialog [type=submit]').click();assert.equal(posts,0,'Consent stays mandatory and unchecked');
   await page.locator('[name=marketing_consent]').check();await page.locator('#subscribe-dialog [type=submit]').click();
   const modal=['accepted','repeated','existing','generic','unknown'].includes(scenario);
   const responseDialog=page.locator('#subscription-pending-dialog');
   if(modal){
    await page.waitForFunction(()=>document.getElementById('subscription-pending-dialog').open);
    assert.equal(await page.locator('#subscribe-dialog').evaluate(e=>e.open),false);
    const mode=scenario==='accepted'?'confirmation':'generic',panel=responseDialog.locator('[data-newsletter-response='+mode+']');
    assert.equal(await panel.getAttribute('aria-hidden'),'false');assert.equal(await panel.evaluate(e=>e.inert),false);
    const other=responseDialog.locator('[data-newsletter-response='+(mode==='confirmation'?'generic':'confirmation')+']');assert.equal(await other.getAttribute('aria-hidden'),'true');assert.equal(await other.evaluate(e=>e.inert),true);assert.equal(await other.isVisible(),false);
    assert.equal(await panel.locator('h2').textContent(),mode==='confirmation'?(lang==='es'?'Confirma tu suscripción':'Confirm your subscription'):(lang==='es'?'Gracias por tu interés en CIM Studio.':'Thank you for your interest in CIM Studio.'));
    assert.equal(await responseDialog.getAttribute('aria-labelledby'),await panel.locator('h2').getAttribute('id'));
    if(mode==='generic'){
     assert.equal(await panel.locator('a').getAttribute('href'),'mailto:admin@cimstudio.es');
     assert.equal(await panel.locator('.dialog-intro').first().textContent(),lang==='es'?'Si todavía no has confirmado tu suscripción, revisa tu correo electrónico. Si ya formas parte de nuestra lista, no necesitas realizar ninguna otra acción.':"If you haven't confirmed your subscription yet, please check your email. If you are already on our mailing list, you don't need to take any further action.");
    }
    assert.ok(!(await responseDialog.innerText()).includes('owner@example.test'));
    const box=await responseDialog.boundingBox(),key=width+lang;if(!dimensions.has(key))dimensions.set(key,box);else for(const dimension of ['width','height'])assert.ok(Math.abs(box[dimension]-dimensions.get(key)[dimension])<1,'both messages share dialog dimensions');
    assert.equal(await responseDialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);
    if(scenario==='existing')await page.keyboard.press('Escape');else if(scenario==='repeated')await responseDialog.locator('[data-close]').click();else await responseDialog.locator('[data-confirmation-close]').click();
    await page.waitForFunction(()=>!document.getElementById('subscription-pending-dialog').open);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'subscribe-dialog');
    if(scenario==='unknown'||scenario==='existing')assert.equal(await page.locator('#email').inputValue(),'owner@example.test','uncertain/pending responses preserve form data');
   }else{
    const expected=scenario==='network'?'pending':scenario==='challenge'?'challenge':scenario==='rate'?'rate':'unavailable';
    await page.waitForFunction(key=>document.querySelector('#subscribe-dialog .status').dataset.message===key,expected);
    assert.equal(await responseDialog.evaluate(e=>e.open),false);
   }
   assert.equal(posts,1);assert.equal(sends,['accepted','unknown','rejected'].includes(scenario)?1:0,'no duplicate sends');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.deepEqual([legal.approved,newsletterRelease.approved],approvals);count++;
  }finally{await context.close();s.close();}
 }
 console.log('PASS '+count+' ES/EN desktop/mobile cases: confirmation, replay, existing contact, generic acceptance, uncertainty, rejection, connection failure, challenge, rate, identical modal dimensions, keyboard dismissal, focus restoration and mandatory consent. No real requests.');
}finally{await browser.close();}
