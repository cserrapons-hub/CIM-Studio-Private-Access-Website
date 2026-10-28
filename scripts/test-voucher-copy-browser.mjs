// Build assets only, with no provider requests, real forms or external connections.
import {createRequire} from 'node:module';import {readFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';import {sampleReceipt} from '../server/sample-receipt.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');const out=process.env.CIM_VOUCHER_SCREENSHOTS||'/workspace/artifacts/cim-voucher';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const width of [1440,768,390])for(const lang of ['es','en']){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<600,hasTouch:width<600});let posts=0;const errors=[];
 await context.route('**/*',async route=>{
  const r=route.request(),url=new URL(r.url());assert.equal(r.method(),'GET','no submissions permitted');assert.equal(url.origin,'https://cimstudio.es','unexpected external request');
  if(url.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},siteLive:true,verified:true,legalVersion:'simulation-copy'}});
  const file='public/'+(url.pathname==='/'?'index.html':url.pathname.slice(1));return route.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'});
 });
 try{
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('https://cimstudio.es/');await page.waitForFunction(()=>window.cimFormSettings);await page.locator(`[data-lang=${lang}]`).click();
 const offer=page.locator('[data-i18n=founders]');assert.match(await offer.innerText(),lang==='es'?/vale de 25 €/:/€25 voucher/);assert.equal(await offer.evaluate(e=>e.scrollWidth>e.clientWidth),false);await offer.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/web-${width}-${lang}.png`});
 await page.locator('[data-legal=notice]').first().click();await page.locator('[data-legal-document=terms]').click();const terms=page.locator('#legal-body');assert.match(await terms.innerText(),lang==='es'?/Un solo uso|un solo uso/:/used once/);assert.equal(await page.locator('#legal-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:`${out}/terms-${width}-${lang}.png`});assert.equal(posts,0);assert.deepEqual(errors,[]);
 const mail=await context.newPage();await mail.setContent(sampleReceipt({shippingAddress:'Example Street 1',postalCode:'00000',city:'Example City',province:'Example Region',country:'Example Country'},lang).html);assert.equal(await mail.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.match(await mail.locator('body').innerText(),lang==='es'?/Un solo uso por miembro fundador/:/One use per founding member/);await mail.screenshot({path:`${out}/email-${width}-${lang}.png`,fullPage:true});count++;
 }finally{await context.close();}
}console.log(`PASS ${count} ES/EN desktop/tablet/mobile web, terms and sample email layouts; no horizontal overflow or submissions.`);}finally{await browser.close();}
