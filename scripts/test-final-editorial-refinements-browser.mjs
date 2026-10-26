// Entirely intercepted local checks, without real form/provider requests.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=Object.fromEntries(['index.html','editorial.css'].map(n=>[n,execFileSync('git',['show','35e6df6:'+n])]));
const out='/workspace/artifacts/cim-final-editorial-refinements';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const width of [1440,1920,390,600,768,1024])for(const lang of ['es','en']){
 let before;
 for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=1100,isMobile:width<=600});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());assert.equal(req.method(),'GET');assert.equal(u.origin,'https://local.test');if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},siteKey:null}});const name=u.pathname==='/'?'index.html':u.pathname.slice(1);return route.fulfill({body:version==='before'&&baseline[name]?baseline[name]:readFileSync('public/'+name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});});
 await page.goto('https://local.test/');await page.locator(`[data-lang=${lang}]`).click();await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));for(const a of document.getAnimations()){a.pause();a.currentTime=0;}dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const gallery=width>1100?'.editorial-v2':'.photograph-pair';
 const metrics=await page.evaluate(gallery=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
 const style=e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,align:s.textAlign,color:s.color,margin:s.margin,padding:s.padding};};
 const heading=document.querySelector('.invitation h1'),ps=[...document.querySelectorAll('.invitation .intro')],button=document.querySelector('.invitation > .primary'),language=document.querySelector('.languages'),ls=getComputedStyle(language);
 return {heading:{rect:rect(heading),style:style(heading),margin:parseFloat(getComputedStyle(heading).marginBottom)},paragraphs:ps.map(e=>({rect:rect(e),style:style(e),margin:parseFloat(getComputedStyle(e).marginBottom)})),button:{rect:rect(button),style:style(button)},language:{rect:rect(language),style:style(language),gap:ls.gap,right:ls.right,top:ls.top},header:rect(document.querySelector('.header')),photos:[...document.querySelectorAll(gallery+' .photograph')].map(e=>({piece:e.dataset.piece,frame:rect(e.querySelector('.photograph-frame')),filter:getComputedStyle(e.querySelector('img')).filter,src:e.querySelector('img').getAttribute('src'),loaded:e.querySelector('img').complete&&e.querySelector('img').naturalWidth>0,category:e.querySelector('.product-category').textContent})),overflow:document.documentElement.scrollWidth>innerWidth};},gallery);
 assert.equal(metrics.overflow,false);assert.ok(metrics.photos.every(p=>p.loaded));
 if(version==='before')before=metrics;
 else{
 assert.deepEqual(metrics.header,before.header,'Header remains unchanged');
 const desktop=width>1100,mobile=width<=600;
 assert.ok(Math.abs(metrics.heading.margin/before.heading.margin-(desktop||mobile?1.3:1))<.001);
 assert.ok(Math.abs(metrics.paragraphs.at(-1).margin/before.paragraphs.at(-1).margin-(desktop||mobile?1.3:1))<.001);
 for(const key of ['font','size','weight','line','align','color','padding']){assert.equal(metrics.heading.style[key],before.heading.style[key]);for(let i=0;i<metrics.paragraphs.length;i++)assert.equal(metrics.paragraphs[i].style[key],before.paragraphs[i].style[key]);}
 for(let i=0;i<metrics.paragraphs.length-1;i++)assert.equal(metrics.paragraphs[i].margin,before.paragraphs[i].margin,'Internal paragraph spacing unchanged');
 for(let i=0;i<metrics.paragraphs.length;i++){const r=metrics.paragraphs[i].rect,old=before.paragraphs[i].rect;assert.ok(Math.abs(r.width/old.width-(desktop?.85:1))<.001);assert.ok(Math.abs(r.x+r.width/2-width/2)<1,'Paragraph block stays centred');}
 assert.deepEqual(metrics.button.style,before.button.style);assert.equal(metrics.button.rect.width,before.button.rect.width);assert.equal(metrics.button.rect.height,before.button.rect.height);
 for(const key of ['font','weight','color'])assert.equal(metrics.language.style[key],before.language.style[key]);for(const key of ['gap','right','top'])assert.equal(metrics.language[key],before.language[key]);assert.ok(Math.abs(parseFloat(metrics.language.style.size)/parseFloat(before.language.style.size)-(desktop?.85:1))<.001);
 assert.deepEqual(metrics.photos.map(p=>p.piece),before.photos.map(p=>p.piece));
 for(const p of metrics.photos){const old=before.photos.find(o=>o.piece===p.piece);assert.equal(p.frame.width,old.frame.width);assert.equal(p.frame.x,old.frame.x);assert.equal(p.filter,old.filter);assert.equal(p.category,old.category);
 if(mobile&&['Arrel','Fil','Talaia'].includes(p.piece)){assert.ok(Math.abs(p.frame.width/p.frame.height-(p.piece==='Arrel'?1:.75))<.001);}else{assert.equal(p.frame.height,old.frame.height,'Other photo formats unchanged');}
 if(p.piece==='Cova')assert.equal(p.src,'assets/editorial-v2/05-cova-nueva.webp');else assert.equal(p.src,old.src);
 if(desktop||!mobile)assert.equal(p.frame.y,old.frame.y,'Desktop/tablet positions unchanged');
 }
 if(!desktop&&!mobile){assert.deepEqual(metrics.heading,before.heading);assert.deepEqual(metrics.paragraphs,before.paragraphs);assert.deepEqual(metrics.button,before.button);}
 if(desktop){const talaia=page.locator('.editorial-v2 [data-piece=Talaia]');await talaia.focus();await page.waitForTimeout(400);assert.equal(await talaia.locator('.talaia-on').evaluate(e=>getComputedStyle(e).opacity),'1');await page.locator('.header-scroll').focus();await page.mouse.move(1,1);await page.waitForTimeout(400);assert.equal(await talaia.locator('.talaia-on').evaluate(e=>getComputedStyle(e).opacity),'0');const cols=await page.locator('.editorial-v2-column').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert.ok(Math.abs(cols[0]-cols[1])<.1);}
 await page.locator('.invitation').screenshot({path:`${out}/${width}-${lang}-presentation.png`});
 for(const piece of mobile?['Cova','Arrel','Fil','Talaia']:['Cova'])await page.locator(`${gallery} [data-piece="${piece}"] .photograph-frame`).screenshot({path:`${out}/${width}-${lang}-${piece}.png`});
 }
 assert.deepEqual(errors,[]);await context.close();count++;
 }
}console.log(`PASS ${count} ES/EN browser checks: desktop width/spacing/language, mobile formats, tablet geometry, unchanged paragraph gaps and Talaia crossfade.`);}finally{await browser.close();}
