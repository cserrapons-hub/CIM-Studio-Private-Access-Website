// Static browser checks only: every request is intercepted, with no real submissions.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=execFileSync('git',['show','ecd1579:editorial.css']);
const out='/workspace/artifacts/cim-desktop-spacing';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const width of [1440,1920,390,768,1024,1100])for(const lang of ['es','en']){
 let before,shot;
 for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=1100,isMobile:width===390});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());assert.equal(req.method(),'GET');assert.equal(u.origin,'https://local.test');if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},siteKey:null}});const name=u.pathname==='/'?'index.html':u.pathname.slice(1);return route.fulfill({body:name==='editorial.css'&&version==='before'?baseline:readFileSync('public/'+name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});});
 await page.goto('https://local.test/');await page.locator(`[data-lang=${lang}]`).click();await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 await page.evaluate(async()=>{for(const a of document.getAnimations()){a.pause();a.currentTime=0;}dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const metrics=await page.evaluate(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
 const style=e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,align:s.textAlign,color:s.color,margin:s.margin,padding:s.padding};};
 const heading=document.querySelector('.invitation h1'),p=[...document.querySelectorAll('.invitation .intro')],button=document.querySelector('.invitation > .primary'),language=document.querySelector('.languages'),ls=getComputedStyle(language);
 return {heading:{rect:rect(heading),style:style(heading),margin:parseFloat(getComputedStyle(heading).marginBottom)},paragraphs:p.map(e=>({rect:rect(e),style:style(e),margin:parseFloat(getComputedStyle(e).marginBottom)})),button:{rect:rect(button),style:style(button)},language:{rect:rect(language),style:style(language),gap:ls.gap,right:ls.right,top:ls.top},fixed:[...document.querySelectorAll('.brand,.header-scroll,.editorial-scroll,.editorial-v2 .photograph-frame')].map(rect),overflow:document.documentElement.scrollWidth>innerWidth};});
 assert.equal(metrics.overflow,false);
 if(width<=1100){const current=await page.screenshot({path:`${out}/${width}-${lang}-${version}.png`,fullPage:true,animations:'disabled'});if(version==='before'){before=metrics;shot=current;}else{assert.deepEqual(metrics,before);assert.deepEqual(current,shot,'Mobile and tablet pixel-identical');}}
 else if(version==='before')before=metrics;
 else{
 assert.deepEqual(metrics.fixed,before.fixed,'Gallery, logo and arrows unchanged');
 assert.ok(Math.abs(metrics.heading.margin/before.heading.margin-1.3)<.001);
 assert.ok(Math.abs(metrics.paragraphs.at(-1).margin/before.paragraphs.at(-1).margin-1.3)<.001);
 for(const key of ['font','size','weight','line','align','color','padding']){assert.equal(metrics.heading.style[key],before.heading.style[key]);for(let i=0;i<metrics.paragraphs.length;i++)assert.equal(metrics.paragraphs[i].style[key],before.paragraphs[i].style[key]);}
 for(let i=0;i<metrics.paragraphs.length-1;i++)assert.equal(metrics.paragraphs[i].margin,before.paragraphs[i].margin,'Other paragraph gaps unchanged');
 assert.deepEqual(metrics.button.style,before.button.style);assert.equal(metrics.button.rect.width,before.button.rect.width);assert.equal(metrics.button.rect.height,before.button.rect.height);
 for(const key of ['font','weight','color'])assert.equal(metrics.language.style[key],before.language.style[key]);for(const key of ['gap','right','top'])assert.equal(metrics.language[key],before.language[key]);assert.ok(Math.abs(parseFloat(metrics.language.style.size)/parseFloat(before.language.style.size)-.9)<.001);
 await page.locator('.invitation').screenshot({path:`${out}/${width}-${lang}-presentation.png`});
 }
 assert.deepEqual(errors,[]);await context.close();count++;
 }
}console.log(`PASS ${count} ES/EN browser checks: desktop spacing +30%, language font -10%, unchanged gallery/button typography, mobile/tablet pixel-identical.`);}finally{await browser.close();}
