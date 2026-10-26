import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const out='/workspace/artifacts/editorial-v2';mkdirSync(out,{recursive:true});let count=0;
try{for(const width of [1440,1920,390,768])for(const lang of ['es','en']){
 let before;
 for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<1101,isMobile:width===390});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const u=new URL(route.request().url());assert.equal(route.request().method(),'GET');assert.equal(u.origin,'https://local.test');if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},siteKey:null}});const name=u.pathname==='/'?'index.html':u.pathname.slice(1);let body;if(version==='before'&&['index.html','editorial.css','editorial-effects.js'].includes(name))body=execFileSync('git',['show','957ec80:'+name]);else body=readFileSync('public/'+name);return route.fulfill({body,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});});
 await page.goto('https://local.test/');await page.locator(`[data-lang=${lang}]`).click();await page.evaluate(async()=>{for(const i of document.images)i.loading="eager";await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 if(width<1101){const shot=await page.screenshot({fullPage:true,animations:'disabled'});if(version==='before')before=shot;else assert.deepEqual(shot,before,'Mobile/tablet pixel identical');}
 else if(version==='after'){
 const cols=page.locator('.editorial-v2-column');assert.equal(await cols.count(),2);
 assert.deepEqual(await cols.nth(0).locator('.product-name').allTextContents(),['Tramuntana','Fil','Cova','Racó']);assert.deepEqual(await cols.nth(1).locator('.product-name').allTextContents(),['Binari','Fita','Arrel','Talaia']);
 const a=await cols.nth(0).boundingBox(),b=await cols.nth(1).boundingBox();assert.ok(Math.abs(a.x+a.width-b.x)<1);assert.equal(a.y,b.y);
 for(const col of await cols.all()){let bottom;for(const fig of await col.locator('figure').all()){const r=await fig.boundingBox(),scroll=await page.evaluate(()=>scrollY);if(bottom)assert.ok(Math.abs(r.y+scroll-bottom)<1);bottom=r.y+scroll+r.height;await fig.focus();await page.waitForTimeout(400);assert.equal(await fig.locator('figcaption').evaluate(e=>getComputedStyle(e).opacity),'1');const cap=await fig.locator('figcaption').boundingBox();assert.ok(Math.abs(cap.y-(await fig.boundingBox()).y)<1);}}
 const talaia=page.locator('[data-piece=Talaia]');await talaia.focus();await page.waitForTimeout(400);assert.equal(await talaia.locator('.talaia-on').evaluate(e=>getComputedStyle(e).opacity),'1');await page.locator('.header-scroll').focus();await page.mouse.move(1,1);await page.waitForTimeout(400);assert.equal(await talaia.locator('.talaia-on').evaluate(e=>getComputedStyle(e).opacity),'0');
 await page.locator('.editorial-v2').screenshot({path:`${out}/${width}-${lang}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(errors,[]);await context.close();count++;
 }
}console.log(`${count} gallery browser checks passed, including pixel-identical mobile/tablet`);}finally{await browser.close();}
