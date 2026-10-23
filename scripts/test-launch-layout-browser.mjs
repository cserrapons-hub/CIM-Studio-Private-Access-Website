// Local editorial preview only. All requests intercepted; no actual forms/provider calls.
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-editorial-preview';mkdirSync(out,{recursive:true});
let cases=0;
async function load(context){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());assert.equal(u.origin,'https://layout.example.test');assert.equal(route.request().method(),'GET');
  if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},verified:false,siteKey:null,siteLive:false}});
  const name=u.pathname==='/'?'/index.html':u.pathname;
  if(!existsSync('public'+name))return route.fulfill({status:404,body:'Missing test asset'});
  const csp=readFileSync('_headers','utf8').match(/Content-Security-Policy: (.+)/)[1];
  return route.fulfill({headers:name.endsWith('.html')?{'Content-Security-Policy':csp}:{},contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':'application/octet-stream',body:readFileSync('public'+name)});
 });
 await page.goto('https://layout.example.test/');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.cimFormSettings);
 return {page,errors};
}
try{
 for(const [width,height] of [[1920,1080],[1440,900],[1101,900],[768,1024],[390,844],[320,740]])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<768,isMobile:width<768});
  try{
   const {page,errors}=await load(context);await page.click('[data-lang='+lang+']');await page.waitForTimeout(350);
   const geometry=await page.evaluate(()=>{
    const r=q=>{const b=document.querySelector(q).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    return {logo:r('.brand'),text:r('.invitation'),volcan:r('.photograph-volcan .photograph-frame'),pool:r('.photograph-pool .photograph-frame'),lamp:r('.photograph-tramuntana .photograph-frame'),support:r('.photograph-soporte .photograph-frame'),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(geometry.overflow,false);assert.ok(Math.abs((geometry.logo.left+geometry.logo.right)/2-width/2)<1,'logo centred');
   assert.ok(geometry.lamp.top>geometry.volcan.top);assert.ok(geometry.pool.top>geometry.volcan.bottom);assert.ok(geometry.pool.left>geometry.volcan.left);
   assert.ok(geometry.support.top>geometry.pool.bottom);assert.ok(geometry.support.top-geometry.pool.bottom<=33);assert.ok(geometry.text.top>Math.max(geometry.lamp.bottom,geometry.support.bottom)+30);
   assert.ok(geometry.pool.width<geometry.volcan.width);assert.ok(Math.abs(geometry.pool.width-geometry.support.width)<1);
   const frames=page.locator('.photograph-frame');assert.equal(await frames.count(),4);
   for(const kind of ['volcan','pool','tramuntana','soporte']){
    const image=page.locator('.photograph-'+kind+' img');assert.ok(await image.evaluate(e=>e.complete&&e.naturalWidth>0));
   }
   assert.deepEqual(await page.locator('figcaption').allTextContents(),['Tramuntana','Fita','Binari','Cleda']);
   const collision=await page.evaluate(()=>{
    const frames=[...document.querySelectorAll('.photograph-frame')].map(e=>e.getBoundingClientRect());
    const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
    return frames.some((a,i)=>frames.some((b,j)=>j>i&&overlap(a,b)))||[...document.querySelectorAll('figcaption')].some(e=>frames.some(b=>overlap(e.getBoundingClientRect(),b)));
   });assert.equal(collision,false,'no photo or caption overlaps');
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow, noarchive');
   const p=await page.locator('.intro').first().evaluate(e=>({font:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight,size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));
   assert.ok(p.font.includes('Montserrat'));assert.equal(p.weight,'300');assert.ok(p.size>=12.5&&p.size<=13);assert.ok(Math.abs(p.line/p.size-1.7)<.02);
   if(width>=1101&&lang==='es'){
    const frame=page.locator('.photograph-volcan .photograph-frame');await frame.scrollIntoViewIfNeeded();await page.mouse.move(width-1,1);await page.waitForTimeout(1600);
    const initial=await frame.locator('img').evaluate(e=>getComputedStyle(e).filter);assert.equal(initial,'saturate(0.85)');
    const before=await frame.boundingBox(),labelBefore=await page.locator('.photograph-volcan figcaption').boundingBox();await frame.hover();await page.waitForTimeout(1650);
    const hover=await frame.locator('img').evaluate(e=>({filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,duration:getComputedStyle(e).transitionDuration}));
    assert.equal(hover.filter,'saturate(1)');assert.ok(hover.transform.includes('1.05'));assert.match(hover.duration,/1.5s/);assert.deepEqual(await frame.boundingBox(),before);assert.deepEqual(await page.locator('.photograph-volcan figcaption').boundingBox(),labelBefore);
    await page.mouse.move(width-1,1);await page.evaluate(()=>scrollBy(0,180));await page.waitForTimeout(800);
    const movement=await frame.evaluate(e=>parseFloat(e.style.getPropertyValue('--photo-y')));assert.ok(Number.isFinite(movement)&&Math.abs(movement)<=15);
   }
   for(const id of ['subscribe-dialog','samples-dialog','careers-dialog']){
    await page.evaluate(id=>document.getElementById(id).showModal(),id);assert.equal(await page.locator('#'+id+' button[type=submit]').isDisabled(),true);assert.equal(await page.locator('#'+id).evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.keyboard.press('Escape');
   }
   assert.equal(await page.locator('#samples-dialog [name=shippingAddress]').count(),1);assert.equal(await page.locator('#samples-dialog [name=project]').count(),0);
   await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.waitForTimeout(700);
   if(lang==='es'&&[1920,1440,390].includes(width))await page.screenshot({path:out+'/editorial-'+width+'.png',fullPage:true});
   assert.deepEqual(errors,[]);cases++;
  }finally{await context.close();}
 }
 const reduced=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 try{const {page,errors}=await load(reduced);await page.locator('.photograph-volcan .photograph-frame').hover();await page.evaluate(()=>scrollBy(0,120));await page.waitForTimeout(150);assert.equal(await page.locator('.photograph-motion').first().evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.deepEqual(errors,[]);cases++;}finally{await reduced.close();}
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const {page,errors}=await load(touch);await page.locator('.photograph-frame').first().tap();await page.waitForTimeout(100);assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).filter),'saturate(0.85)');assert.equal(await page.locator('.photograph-motion').first().evaluate(e=>getComputedStyle(e).transform),'none');assert.deepEqual(errors,[]);cases++;}finally{await touch.close();}
 console.log('PASS',cases,'editorial ES/EN, viewport, hover/parallax, reduced-motion, touch, unchanged modal, no-overflow and no-console-error cases. No real submissions. Screenshots:',out);
}finally{await browser.close();}
