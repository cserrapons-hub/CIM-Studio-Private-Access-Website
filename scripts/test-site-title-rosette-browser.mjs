// Static local before/after comparison. No submissions or provider access.
import {createRequire} from 'node:module';import {readFileSync,mkdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=Object.fromEntries(['index.html','script.js','integrations.js'].map(n=>[n,execFileSync('git',['show','b7cab98:'+n])]));
const out=process.env.CIM_TITLE_SCREENSHOTS||'/tmp/cim-title-rosette';mkdirSync(out,{recursive:true});
const titles={es:'CIM Studio — Cerámica artesanal de Mallorca',en:'CIM Studio — Handmade Ceramics from Mallorca'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const [width,live] of [[1440,false],[1920,true],[768,true],[390,false],[390,true]])for(const lang of ['es','en']){
 let before,shot;
 for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=1100,isMobile:width===390}),page=await context.newPage(),errors=[];let posts=0;
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
  if(u.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
  assert.equal(u.origin,'https://local.test');if(r.method()==='POST'){posts++;throw Error('No submission allowed');}
  if(u.pathname==='/api/config'){await new Promise(r=>setTimeout(r,250));return route.fulfill({json:{enabled:{subscribe:true,samples:true,careers:true},siteKey:'simulation',verified:false,siteLive:live,legalVersion:'simulation-policy'}});}
  const name=u.pathname==='/'?'index.html':u.pathname.slice(1);return route.fulfill({body:version==='before'&&baseline[name]?baseline[name]:readFileSync('public/'+name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});
 });
 await page.goto('https://local.test/',{waitUntil:'domcontentloaded'});
 if(version==='after'){
  assert.equal(await page.title(),titles.es);await page.locator('[data-lang=en]').click();await page.waitForFunction(()=>window.cimFormSettings);assert.equal(await page.title(),titles.en,'Configuration/live refresh preserves English');
 }else await page.waitForFunction(()=>window.cimFormSettings);
 await page.locator(`[data-lang=${lang}]`).click();
 for(const id of ['subscribe-dialog','samples-dialog','careers-dialog']){
  await page.locator(`[data-open=${id}]`).click();await page.waitForFunction(id=>!document.querySelector('#'+id+' [type=submit]').disabled,id);
  if(version==='after')assert.equal(await page.title(),titles[lang],'Widget/availability refresh preserves selected title');
  await page.locator('#'+id+' [data-close]').click();
 }
 await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));for(const a of document.getAnimations()){a.pause();a.currentTime=0;}dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const geometry=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y+scrollY,r.width,r.height];};
  return {frames:[...document.querySelectorAll('.photograph .photograph-frame')].map(rect),captionStyles:[...document.querySelectorAll('.photograph figcaption')].map(e=>{const s=getComputedStyle(e);return [s.font,s.color,s.padding,s.margin,s.transition];}),fixed:[...document.querySelectorAll('.brand,.header-scroll,.editorial-scroll,.invitation')].map(rect),names:[...document.querySelectorAll('.photograph:not([data-piece=Arrel]) .product-name')].map(e=>e.textContent),previewHidden:document.querySelector('.preview-notice').hidden,robots:document.querySelector('meta[name=robots]').content};
 });
 // Hide only this caption for pixel comparison, avoiding fractional-pixel screenshot-mask edges.
 const hiddenCaption=await page.addStyleTag({content:'[data-piece=Arrel] figcaption{visibility:hidden!important}'});
 const current=await page.screenshot({path:`${out}/${width}-${live}-${lang}-${version}.png`,fullPage:true,animations:'disabled'});
 await hiddenCaption.evaluate(e=>e.remove());
 if(version==='before'){before=geometry;shot=current;}
 else{
  assert.deepEqual(geometry,before,'Gallery, typography, other names, notice/indexing and all layout unchanged');assert.ok(current.equals(shot),'Visuals identical after masking only the renamed label');
  const roses=page.locator('[data-piece=Arrel]');assert.equal(await roses.count(),2);
  for(const rose of await roses.all()){assert.equal(await rose.locator('.product-name').textContent(),'Fil');assert.equal(await rose.locator('img').getAttribute('alt'),'Fil');assert.equal(await rose.locator('img').getAttribute('src'),'assets/editorial-v2/06-arrel.webp');assert.equal(await rose.locator('.product-category').textContent(),lang==='es'?'ROSETÓN CERÁMICO':'CERAMIC CEILING ROSE');}
  if(width>1100){const rose=page.locator('.editorial-v2 [data-piece=Arrel]');await rose.hover();await page.waitForTimeout(400);await rose.screenshot({path:`${out}/${width}-${lang}-Fil.png`});}
  for(const next of ['es','en','es','en']){await page.locator(`[data-lang=${next}]`).click();assert.equal(await page.title(),titles[next]);}
  await page.reload();await page.waitForFunction(()=>window.cimFormSettings);assert.equal(await page.locator('html').getAttribute('lang'),'es');assert.equal(await page.title(),titles.es,'Reload preserves the existing Spanish default and correct title');
 }
 assert.equal(posts,0);assert.deepEqual(errors,[]);await context.close();count++;
 }
}console.log(`PASS ${count} before/after browser cases: 1440/1920/768/390, ES/EN, live/preview, load/reload/language/widget refresh titles, identical geometry/visuals except the Fil label; no submissions.`);}finally{await browser.close();}
