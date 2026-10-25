// UI-only regression: every request is intercepted; no form is submitted.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of ['verified','unverified','partial','disabled','config_error']){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500}),errors=[];let submissions=0;
  const enabled={subscribe:!['disabled','config_error'].includes(scenario),samples:!['disabled','config_error','partial'].includes(scenario),careers:!['disabled','config_error'].includes(scenario)};
  try{
   await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());if(request.method()!=='GET'){submissions++;assert.fail('No submission is allowed');}
    if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.cimTurnstileReady();window.turnstile={render:()=>1,remove:()=>{},getResponse:()=>'',reset:()=>{}};"});
    assert.equal(url.origin,'https://cimstudio.es');
    if(url.pathname==='/api/config')return route.fulfill(scenario==='config_error'?{status:503,json:{error:'unavailable'}}:{json:{enabled,verified:scenario==='verified',siteKey:'simulation-only',siteLive:false,legalVersion:'simulation-only',legal:null}});
    const file='public'+(url.pathname==='/'?'/index.html':url.pathname);return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream',body:readFileSync(file)});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://cimstudio.es/');if(scenario==='config_error')await page.waitForTimeout(150);else await page.waitForFunction(()=>window.cimFormSettings);
   await page.locator('[data-lang='+lang+']').click();
   for(const kind of ['subscribe','samples','careers']){
    await page.locator('[data-open="'+kind+'-dialog"]').click();
    const form=page.locator('form[data-form-kind='+kind+']'),note=form.locator('.demo');
    assert.equal(await note.isVisible(),!enabled[kind],scenario+' '+kind+' '+lang);
    assert.equal(await form.locator('[type=submit]').isDisabled(),!enabled[kind]);
    if(enabled[kind])assert.equal(await note.textContent(),'');else assert.match(await note.textContent(),lang==='es'?/todavía no disponible/:/not available yet/);
    assert.doesNotMatch(await page.locator('body').innerText(),/Demostración de conexión|Connection demonstration/);
    for(const checkbox of await form.locator('input[type=checkbox]').all())assert.equal(await checkbox.isChecked(),false);
    if(enabled[kind]){await page.waitForFunction(()=>Boolean(window.turnstile));assert.equal(await form.locator('.challenge-slot').count(),1);}
    assert.equal(await form.evaluate(e=>e.closest('dialog').scrollWidth>e.closest('dialog').clientWidth),false);await page.keyboard.press('Escape');
   }
   assert.equal(submissions,0);assert.deepEqual(errors,[]);cases++;
  }finally{await context.close();}
 }
 console.log('PASS',cases,'ES/EN desktop/mobile cases: public notices absent for enabled forms with either verification flag; disabled/config-error forms stay blocked with availability notice; consent and Turnstile preserved. No submissions.');
}finally{await browser.close();}
