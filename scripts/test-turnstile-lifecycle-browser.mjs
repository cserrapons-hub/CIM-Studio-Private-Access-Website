// Read-only browser simulation: every network request is intercepted, no provider calls.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let count=0;
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const kind of ['subscribe','samples','careers'])for(const scenario of (process.env.CIM_TURNSTILE_SCENARIOS?.split(',')||['accepted','pending','load_recovery','render_recovery','empty','expired','getter_error','reopen_language','error_callback','timeout_callback','config_delayed','load_delayed'])){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});let posts=0,loads=0;const errors=[];
  await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   if(u.hostname==='challenges.cloudflare.com'){
    loads++;if(scenario==='load_delayed')await new Promise(resolve=>setTimeout(resolve,300));if(scenario==='load_recovery'&&loads===1)return route.abort('failed');
    return route.fulfill({contentType:'application/javascript',body:`window.sim={widgets:new Map(),next:0,failRender:${scenario==='render_recovery'},failGet:false};window.turnstile={render:(slot,options)=>{if(sim.failRender){sim.failRender=false;throw Error('simulated render');}const id=++sim.next;sim.widgets.set(id,{slot,options,token:'simulation-token'});queueMicrotask(()=>options.callback('simulation-token'));return id;},remove:id=>sim.widgets.delete(id),getResponse:id=>{if(sim.failGet)throw Error('simulated getter');return sim.widgets.get(id)?.token||'';},reset:id=>{const w=sim.widgets.get(id);if(w){w.token='';queueMicrotask(()=>{w.token='simulation-token';w.options.callback(w.token);});}}};window.cimTurnstileReady();`});
   }
   assert.equal(u.origin,'https://cimstudio.es');
   if(u.pathname==='/api/config'&&scenario==='config_delayed')await new Promise(resolve=>setTimeout(resolve,300));
   if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:true,samples:true,careers:true},siteKey:'simulation',verified:true,siteLive:true,legalVersion:'simulation'}});
   if(u.pathname.startsWith('/api/')){posts++;assert.equal(u.pathname,'/api/'+kind);const data=r.postDataJSON();assert.equal(data.token,'simulation-token');
    if(kind==='subscribe')return route.fulfill({status:scenario==='pending'?409:202,json:scenario==='pending'?{error:'pending'}:{ok:true,subscription:'confirmation_required'}});
    return route.fulfill({status:202,json:{ok:true,recorded:true,receiptMailState:scenario==='pending'?'pending':'accepted',mailState:'accepted',confirmationRequired:kind==='careers'}});
   }
   const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
   return route.fulfill({body:readFileSync('public/'+file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'});
  });
  try{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://cimstudio.es');if(scenario==='config_delayed')await page.locator('[data-open='+(kind==='subscribe'?'subscribe-dialog':kind+'-dialog')+']').click();await page.waitForFunction(()=>window.cimFormSettings);
   const dialog=kind==='subscribe'?'subscribe-dialog':kind+'-dialog';
   if(scenario==='config_delayed')await page.locator('#'+dialog+' [data-close]').click();await page.locator('[data-lang='+lang+']').click();await page.locator('[data-open='+dialog+']').click();
   if(scenario==='load_delayed'){await page.locator('#'+dialog+' [data-close]').click();await page.locator('[data-lang='+(lang==='es'?'en':'es')+']').click();await page.locator('[data-open='+dialog+']').click();}
   const form=page.locator('#'+dialog+' form'),button=form.locator('[type=submit]');
   if(scenario==='load_recovery'||scenario==='render_recovery'){
    await page.waitForFunction(id=>document.querySelector('#'+id+' .status').dataset.security==='true',dialog);
    for(const other of ['subscribe','samples','careers'].filter(k=>k!==kind))assert.equal(await page.locator('form[data-form-kind='+other+'] .status').getAttribute('data-message'),null,'failure isolated');
   }
   await button.waitFor();await page.waitForFunction(id=>!document.querySelector('#'+id+' [type=submit]').disabled,dialog);
   await form.locator('[name=email]').fill('fictional@example.test');
   if(kind==='subscribe')await form.locator('[name=subscriberType]').selectOption('profesional');
   if(kind==='samples'){
    for(const field of ['name','company','shippingAddress','postalCode','city','province','country'])await form.locator('[name='+field+']').fill('Example');
    await form.locator('[name=discipline]').selectOption('architecture');
   }
   await form.locator('[type=checkbox]').check();
   if(['empty','expired','getter_error','error_callback','timeout_callback'].includes(scenario)){
    await page.evaluate(({kind,scenario})=>{const w=[...sim.widgets.values()].find(w=>w.options.action===kind);if(scenario==='getter_error')sim.failGet=true;else{w.token='';if(scenario==='expired')w.options['expired-callback']();if(scenario==='error_callback')w.options['error-callback']();if(scenario==='timeout_callback')w.options['timeout-callback']();}document.querySelector('form[data-form-kind='+kind+']').requestSubmit();},{kind,scenario});
    await page.waitForFunction(id=>document.querySelector('#'+id+' .status').dataset.security==='true',dialog);
    assert.equal(posts,0);assert.equal(await form.locator('[name=email]').inputValue(),'fictional@example.test');assert.equal(await button.isDisabled(),true);
    await page.evaluate(kind=>{sim.failGet=false;const w=[...sim.widgets.values()].find(w=>w.options.action===kind);w.token='simulation-token';w.options.callback(w.token);},kind);
    await page.waitForFunction(id=>!document.querySelector('#'+id+' [type=submit]').disabled,dialog);
    assert.equal(await form.locator('.status').textContent(),'');
    // A later successful security callback must not erase non-security feedback.
    await page.evaluate(kind=>{const status=document.querySelector('form[data-form-kind='+kind+'] .status');status.textContent='Keep API result';status.dataset.message='receivedSamples';delete status.dataset.security;[...sim.widgets.values()].find(w=>w.options.action===kind).options.callback('simulation-token');},kind);
    assert.equal(await form.locator('.status').textContent(),'Keep API result');
   }
   if(scenario==='reopen_language'){
    await page.locator('#'+dialog+' [data-close]').click();await page.locator('[data-lang='+(lang==='es'?'en':'es')+']').click();await page.locator('[data-open='+dialog+']').click();await page.waitForFunction(id=>!document.querySelector('#'+id+' [type=submit]').disabled,dialog);
    await page.setViewportSize({width:width===390?400:1420,height:900});await page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new Event('cim:language'));});await page.waitForFunction(id=>!document.querySelector('#'+id+' [type=submit]').disabled,dialog);assert.equal(await page.evaluate(kind=>[...sim.widgets.values()].filter(w=>w.options.action===kind).length,kind),1,'one live widget per form after concurrent events');
   }
   await button.click();
   if(kind==='careers')await page.waitForFunction(()=>document.querySelector('form[data-form-kind=careers] .status').dataset.message==='receivedCareers');
   else await page.waitForFunction(id=>document.getElementById(id).open,kind==='subscribe'?'subscription-pending-dialog':'samples-response-dialog');
   if(kind==='subscribe')assert.equal(await page.locator('[data-newsletter-response='+(scenario==='pending'?'generic':'confirmation')+']').getAttribute('aria-hidden'),'false');
   if(kind==='samples')assert.equal(await page.locator('[data-samples-response='+(scenario==='pending'?'pending':'accepted')+']').getAttribute('aria-hidden'),'false');
   assert.equal(posts,1);assert.deepEqual(errors,[]);count++;
  }finally{await context.close();}
 }
 console.log('PASS '+count+' Turnstile lifecycle cases: all forms, ES/EN, desktop/mobile, isolated load/render failures and recovery, empty/expired tokens, getter exceptions, language/reopen/resize, preserved data and API feedback, exact one POST, response modals. All requests simulated.');
}finally{await browser.close();}
