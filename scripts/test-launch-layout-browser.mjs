// Preview only: all HTTP is intercepted; never contacts providers or stores real data.
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-editorial-final';mkdirSync(out,{recursive:true});
let cases=0;
const csp=readFileSync('_headers','utf8').match(/Content-Security-Policy: (.+)/)[1];
async function load(context){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await context.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());assert.equal(u.origin,'https://layout.example.test');assert.equal(req.method(),'GET');
  if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},verified:false,siteKey:null,siteLive:false}});
  const name=u.pathname==='/'?'/index.html':u.pathname;if(!existsSync('public'+name))return route.fulfill({status:404,body:'Missing preview file'});
  return route.fulfill({headers:name.endsWith('.html')?{'Content-Security-Policy':csp}:{},contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':'application/octet-stream',body:readFileSync('public'+name)});
 });
 await page.goto('https://layout.example.test/');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.cimFormSettings);return {page,errors};
}
const near=(actual,expected,message,tolerance=1.2)=>assert.ok(Math.abs(actual-expected)<tolerance,`${message}: ${actual} vs ${expected}`);
try{
 for(const [width,height] of [[2480,1400],[1920,1080],[1440,900],[1024,900],[768,1024],[390,844],[320,740]])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<768,isMobile:width<768});
  try{
   const {page,errors}=await load(context);await page.click('[data-lang='+lang+']');await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(100);
   const categoryStyle=await page.locator('.product-category').first().evaluate(e=>({weight:getComputedStyle(e).fontWeight,size:getComputedStyle(e).fontSize}));assert.deepEqual(categoryStyle,{weight:'300',size:'9px'});assert.equal(await page.locator('.product-name').first().evaluate(e=>getComputedStyle(e).fontWeight),'500');
   const cue=page.locator('.header-scroll');const cb=await cue.boundingBox();assert.ok(cb.y>0&&cb.y+cb.height+8<height,'header cue visible in first viewport');
   assert.deepEqual(await page.locator('.product-category').allTextContents(),lang==='en'?['CULINARY OBJECT','SIGNAGE','WALL LIGHT','BATHROOM ACCESSORY']:['PIEZA GASTRONÓMICA','SEÑALÉTICA','APLIQUE','ACCESORIO DE BAÑO']);
   await page.mouse.click(cb.x+cb.width/2,cb.y+cb.height/2);await page.waitForFunction(()=>document.activeElement.id==='editorial-photographs'&&Math.abs(document.getElementById('editorial-photographs').getBoundingClientRect().top)<2);await page.evaluate(()=>scrollTo(0,0));
   const g=await page.evaluate(()=>{
    const r=q=>{const b=document.querySelector(q).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    return {logo:r('.brand'),volcan:r('.photograph-volcan .photograph-frame'),binari:r('.photograph-tramuntana .photograph-frame'),cleda:r('.photograph-soporte .photograph-frame'),fita:r('.photograph-pool .photograph-frame'),arrow:r('.editorial-scroll'),text:r('.invitation'),overflow:document.documentElement.scrollWidth>innerWidth};
   });assert.equal(g.overflow,false);near((g.logo.left+g.logo.right)/2,width/2,'centred logo');
   if(width>600){const scale=width/2480;for(const [key,x,y,w,h] of [['volcan',264,1215,976,1067],['binari',1240,2133,985,1476],['cleda',504,4044,737,620],['fita',1241,4044,614,620]]){near(g[key].left,x*scale,key+' left');near(g[key].top,y*scale,key+' top');near(g[key].width,w*scale,key+' width');near(g[key].height,h*scale,key+' height');}near(g.arrow.top,5013*scale,'arrow top');near(g.arrow.height,167*scale,'arrow height');near(g.text.top,5559*scale,'text top');}
   near(g.volcan.right,g.binari.left,'upper touching edges');near(g.cleda.right,g.fita.left,'lower touching edges');near(g.cleda.top,g.fita.top,'lower top alignment');near(g.cleda.bottom,g.fita.bottom,'lower bottom alignment');
   assert.ok(g.binari.top<g.volcan.bottom&&g.binari.top>g.volcan.top,'intentional staggered alignment');assert.ok(g.cleda.top>g.binari.bottom+40);assert.ok(g.arrow.top>g.cleda.bottom);assert.ok(g.text.top>g.arrow.bottom);near((g.arrow.left+g.arrow.right)/2,width/2,'centred arrow');
   const collision=await page.evaluate(()=>{const frames=[...document.querySelectorAll('.photograph-frame')].map(e=>e.getBoundingClientRect());const hit=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;return frames.some((a,i)=>frames.some((b,j)=>j>i&&hit(a,b)))||[...document.querySelectorAll('.product-label')].some(e=>frames.some(b=>hit(e.getBoundingClientRect(),b)));});assert.equal(collision,false,'no accidental image/caption overlaps '+width+' '+lang);
   assert.deepEqual(await page.locator('.product-name').allTextContents(),['Tramuntana','Fita','Binari','Cleda']);
   for(const fig of await page.locator('figure').all()){const frame=fig.locator('.photograph-frame'),img=fig.locator('img');assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth>0));const ratio=await img.evaluate(e=>e.naturalWidth/e.naturalHeight),b=await frame.boundingBox();near(b.width/b.height,ratio,'original aspect ratio',.001);const caption=await fig.locator('figcaption').evaluate(e=>({top:getComputedStyle(e).borderTopWidth,bottom:getComputedStyle(e).borderBottomWidth}));assert.ok(parseFloat(caption.top)>0||parseFloat(caption.bottom)>0);}
   assert.equal(await page.locator('.editorial-scroll').count(),1);assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow, noarchive');
   if(width>=1440&&lang==='es'){
    const frame=page.locator('.photograph-volcan .photograph-frame');await frame.scrollIntoViewIfNeeded();await page.mouse.move(width-1,1);await page.waitForTimeout(750);assert.equal(await frame.locator('img').evaluate(e=>getComputedStyle(e).filter),'saturate(0.2)');
    const before=await frame.boundingBox(),label=await page.locator('.photograph-volcan figcaption').boundingBox();await frame.hover();await page.waitForTimeout(760);const style=await frame.locator('img').evaluate(e=>({filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,duration:getComputedStyle(e).transitionDuration}));assert.equal(style.filter,'saturate(1)');assert.ok(style.transform.includes('1.05'));assert.match(style.duration,/0.7s/);assert.deepEqual(await frame.boundingBox(),before);assert.deepEqual(await page.locator('.photograph-volcan figcaption').boundingBox(),label);for(const img of await page.locator('.photograph:not(.photograph-volcan) img').all())assert.equal(await img.evaluate(e=>getComputedStyle(e).filter),'saturate(0.2)');await page.mouse.move(width-1,1);await page.waitForTimeout(760);
   }
   // Test a real smooth-scroll interaction, not a direct jump or a simulated form.
   await page.locator('.editorial-scroll').click();await page.waitForFunction(()=>{const e=document.getElementById('invitation'),margin=parseFloat(getComputedStyle(e).scrollMarginTop)||0,target=Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+e.getBoundingClientRect().top-margin);return Math.abs(scrollY-target)<2;});assert.equal(await page.evaluate(()=>document.activeElement.id),'invitation');assert.ok(await page.locator('.invitation').evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<innerHeight*.7));
   for(const id of ['subscribe-dialog','samples-dialog','careers-dialog']){await page.evaluate(id=>document.getElementById(id).showModal(),id);assert.equal(await page.locator('#'+id+' button[type=submit]').isDisabled(),true);assert.equal(await page.locator('#'+id).evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.keyboard.press('Escape');}
   await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.waitForTimeout(100);if([2480,1920,1440,390].includes(width))await page.screenshot({path:out+'/editorial-'+width+'-'+lang+'.png',fullPage:true});assert.deepEqual(errors,[]);cases++;
  }finally{await context.close();}
 }
 const reduced=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});try{const {page,errors}=await load(reduced);assert.equal(await page.locator('.header-scroll').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('.photograph-volcan .photograph-frame').hover();assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await page.locator('.editorial-scroll').click();assert.ok(await page.locator('.invitation').evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<innerHeight*.7));assert.deepEqual(errors,[]);cases++;}finally{await reduced.close();}
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{const {page,errors}=await load(touch);for(const img of await page.locator('.photograph img').all())assert.equal(await img.evaluate(e=>getComputedStyle(e).filter),'saturate(1)');await page.locator('.photograph-frame').first().tap();assert.equal(await page.locator('.photograph img').first().evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)');assert.deepEqual(errors,[]);cases++;}finally{await touch.close();}
 console.log('PASS',cases,'reference geometry, ES/EN, desktop/mobile, isolated saturation/zoom, arrow navigation, reduced motion, CSP and unchanged modals. No real requests. Screenshots:',out);
}finally{await browser.close();}
