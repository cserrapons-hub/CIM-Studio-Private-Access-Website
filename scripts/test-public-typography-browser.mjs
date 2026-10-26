// Read-only UI comparison: intercepted GETs only, no form submissions or providers.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import legal from '../legal/content.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=execFileSync('git',['show','a803c86:styles.css'],{encoding:'utf8'});
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-public-typography';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
const results={};
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const version of ['before','after']){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500}),errors=[];
  try{
   await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());assert.equal(req.method(),'GET','no submissions');
    if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
    assert.equal(url.origin,'https://cimstudio.es');
    if(url.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:true,samples:true,careers:true},verified:true,siteKey:'simulation-only',siteLive:true,legalVersion:legal.version,legal:{es:legal.es,en:legal.en}}});
    const name='public'+(url.pathname==='/'?'/index.html':url.pathname),body=version==='before'&&url.pathname==='/styles.css'?baseline:readFileSync(name);
    return route.fulfill({contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream',body});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://cimstudio.es');await page.waitForFunction(()=>window.cimFormSettings);await page.locator('[data-lang='+lang+']').click();await page.evaluate(()=>document.fonts.ready);
   const geometry=await page.evaluate(()=>Object.fromEntries(['.brand','.invitation','h1','.intro','.photograph-volcan','.photograph-tramuntana','.photograph-pool','.photograph-soporte'].map(selector=>{const e=document.querySelector(selector),b=e.getBoundingClientRect(),s=getComputedStyle(e);return [selector,{x:b.x,y:b.y,width:b.width,height:b.height,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,margin:s.margin}];})));
   const key=width+'-'+lang;
   if(version==='before')results[key]=geometry;else{const expected=structuredClone(results[key]);expected['.intro'].fontWeight='400';assert.deepEqual(geometry,expected,'geometry and paragraph metrics unchanged apart from requested weight');}
   if(version==='after'){assert.equal(await page.locator('.intro').first().evaluate(e=>getComputedStyle(e).fontWeight),'400');assert.equal(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Montserrat'&&f.weight==='400'&&f.status==='loaded')),true,'real Montserrat Regular loaded');}
   if(version==='after')for(const selector of ['.intro','.professional'])assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');
   await page.screenshot({path:out+'/'+key+'-home-'+version+'.png',fullPage:true});
   for(const kind of ['subscribe','samples','careers']){
    await page.locator('[data-open='+kind+'-dialog]').click();const form=page.locator('form[data-form-kind='+kind+']');
    assert.equal(await form.locator('.demo').isVisible(),false);assert.equal(await form.locator('[type=submit]').isDisabled(),false);
    if(version==='after'){
     assert.equal(await form.locator('label').first().evaluate(e=>getComputedStyle(e).fontWeight),'400');
     assert.equal(await form.locator('label').first().evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');
     for(const input of await form.locator('input:not([type=checkbox]):not([name=website]),textarea').all()){
      if(await input.getAttribute('placeholder')){const placeholder=await input.evaluate(e=>{const s=getComputedStyle(e,'::placeholder');return {color:s.color,weight:s.fontWeight,opacity:s.opacity};});assert.deepEqual(placeholder,{color:'rgb(107, 108, 101)',weight:'400',opacity:'1'});}
      const b=await input.boundingBox();await input.fill(await input.getAttribute('type')==='email'?'sample@example.test':'Datos ficticios / Fictional details');
      await page.evaluate(()=>document.fonts.ready);assert.deepEqual(await input.boundingBox(),b,'field geometry unchanged by entered value');
      const s=await input.evaluate(e=>{const c=getComputedStyle(e),p=getComputedStyle(e,'::placeholder');return {weight:c.fontWeight,color:c.color,family:c.fontFamily,placeholderColor:p.color,placeholderWeight:p.fontWeight,placeholderOpacity:p.opacity};});
      assert.equal(s.weight,'500');assert.equal(s.color,'rgb(41, 42, 38)');assert.ok(s.family.includes('Montserrat'));
     }
     for(const select of await form.locator('select').all()){
      assert.equal(await select.evaluate(e=>getComputedStyle(e).color),'rgb(107, 108, 101)');const value=await select.locator('option:not([value=""])').first().getAttribute('value');await select.selectOption(value);assert.equal(await select.evaluate(e=>getComputedStyle(e).fontWeight),'500');assert.equal(await select.evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');
     }
     assert.equal(await form.locator('input[type=checkbox]').isChecked(),false);assert.equal(await form.locator('.consent').evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');
    }else{for(const input of await form.locator('input:not([type=checkbox]):not([name=website])').all())await input.fill(await input.getAttribute('type')==='email'?'sample@example.test':'Datos ficticios / Fictional details');for(const select of await form.locator('select').all())await select.selectOption(await select.locator('option:not([value=""])').first().getAttribute('value'));}
    assert.equal(await form.evaluate(e=>e.closest('dialog').scrollWidth>e.closest('dialog').clientWidth),false);await page.screenshot({path:out+'/'+key+'-'+kind+'-'+version+'.png',fullPage:true});await page.keyboard.press('Escape');
   }
   // Real approved text, but no legal, backend or provider writes.
   await page.locator('[data-legal=privacy]').first().click();if(version==='after'){assert.equal(await page.locator('#legal-body').evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');assert.equal(await page.locator('#legal-body').evaluate(e=>getComputedStyle(e).fontWeight),'400');}await page.screenshot({path:out+'/'+key+'-legal-'+version+'.png',fullPage:true});await page.keyboard.press('Escape');
   for(const id of ['subscription-pending-dialog','samples-response-dialog']){await page.evaluate(id=>document.getElementById(id).showModal(),id);if(version==='after')for(const p of await page.locator('#'+id+' .dialog-intro:visible').all()){assert.equal(await p.evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');assert.equal(await p.evaluate(e=>getComputedStyle(e).fontWeight),'400');}assert.equal(await page.locator('#'+id).evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.keyboard.press('Escape');}
   assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));cases++;
  }finally{await context.close();}
 }
 writeFileSync(out+'/geometry.json',JSON.stringify(results,null,2));console.log('PASS',cases,'before/after ES/EN desktop/mobile cases: unchanged homepage geometry, paragraph metrics and field dimensions, true Medium, regular labels, legible placeholders, legal/modal text, no demo notices. No submissions. Screenshots:',out);
}finally{await browser.close();}
