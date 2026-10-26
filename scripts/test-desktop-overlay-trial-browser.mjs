// Local visual trial. All network is intercepted; no form or provider requests.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-desktop-overlay-trial';mkdirSync(out,{recursive:true});
const baseline=Object.fromEntries(['editorial.css','editorial-effects.js'].map(name=>[name,execFileSync('git',['show','7e9f5ed:'+name])]));
const profiles=[{name:'desktop1440',width:1440},{name:'desktop1920',width:1920},{name:'mobile390',width:390,touch:true},{name:'touch1440',width:1440,touch:true},{name:'reduced1440',width:1440,reduced:true}];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const profile of profiles)for(const lang of ['es','en']){
  let before,mobileImage;
  for(const version of ['before','after']){
   let font600Requests=0;
   const context=await browser.newContext({viewport:{width:profile.width,height:900},hasTouch:Boolean(profile.touch),isMobile:profile.width<600,reducedMotion:profile.reduced?'reduce':'no-preference'}),errors=[];
   try{
    await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());assert.equal(r.method(),'GET');assert.equal(u.origin,'https://trial.example.test');
     if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},verified:false,siteKey:null}});
     if(u.pathname.includes('montserrat-latin-600.'))font600Requests++;
     const relative=u.pathname==='/'?'index.html':u.pathname.slice(1),bytes=version==='before'&&baseline[relative]?baseline[relative]:readFileSync('public/'+relative);
     return route.fulfill({body:bytes,contentType:relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.html')?'text/html':'application/octet-stream'});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://trial.example.test');await page.locator('[data-lang='+lang+']').click();await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));for(const e of document.querySelectorAll('.header-scroll,.editorial-scroll'))for(const a of e.getAnimations()){a.pause();a.currentTime=0;}});
    const geometry=await page.evaluate(()=>{
     const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
     const style=selector=>{const s=getComputedStyle(document.querySelector(selector));return {size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,margin:s.margin};};
     return {fixed:['.brand','.photograph-volcan .photograph-frame','.photograph-tramuntana .photograph-frame','.photograph-pool .photograph-frame','.photograph-soporte .photograph-frame','.editorial-scroll'].map(rect),block:rect('.invitation'),text:['.invitation h1','.intro','.professional'].map(style),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(version==='before')before=geometry;else{assert.deepEqual(geometry.fixed,before.fixed,'Logo, frames and arrow unchanged');if(profile.width>1100){assert.ok(Math.abs(geometry.block.width/before.block.width-.85)<.0001,'Desktop presentation width reduced by 15%');assert.equal(geometry.block.y,before.block.y);assert.ok(Math.abs(geometry.block.x+geometry.block.width/2-profile.width/2)<1,'Narrower container stays centred');}else assert.deepEqual(geometry.block,before.block,'Mobile/tablet container unchanged');assert.deepEqual(geometry.text,before.text,'Font sizes, weights, line heights and spacing unchanged');assert.equal(geometry.overflow,false);}
    const desktop=profile.width>1100,overlay=desktop&&!profile.touch&&version==='after';
    assert.equal(await page.locator('.invitation').evaluate(e=>getComputedStyle(e).textAlign),desktop&&version==='after'?'center':'left');
    if(desktop&&version==='after')for(const selector of ['.invitation h1','.invitation .intro','.invitation .professional'])assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).textAlign),selector==='.invitation h1'?'center':'left');
    if(desktop&&version==='after'){const block=await page.locator('.invitation').boundingBox();for(const p of await page.locator('.invitation .intro').all()){const r=await p.boundingBox();assert.ok(Math.abs(r.x-block.x)<1&&Math.abs(r.width-block.width)<1,'All paragraphs fill the same left-aligned column');}}
    assert.deepEqual(await page.locator('.product-name').allTextContents(),['Tramuntana','Fita','Binari','Cleda']);
    for(const fig of await page.locator('.photograph').all()){
     const caption=fig.locator('figcaption');assert.equal(await caption.evaluate(e=>getComputedStyle(e).opacity),overlay?'0':'1');assert.equal(await fig.getAttribute('tabindex'),overlay?'0':null);
     if(overlay){
      assert.equal(await fig.locator('.product-category').isVisible(),true);const initial=await fig.locator('.photograph-frame').boundingBox(),initialScroll=await page.evaluate(()=>scrollY);
      await fig.locator('.photograph-frame').hover();await page.waitForTimeout(profile.reduced?30:400);assert.equal(await caption.evaluate(e=>getComputedStyle(e).opacity),'1');
      const style=await caption.evaluate(e=>{const s=getComputedStyle(e);return {duration:s.transitionDuration,background:s.backgroundColor,color:s.color,shadow:s.textShadow};});assert.equal(style.duration,profile.reduced?'0s':'0.35s');assert.equal(style.background,'rgba(0, 0, 0, 0)');const light=await fig.evaluate(e=>e.classList.contains('photograph-soporte')||e.classList.contains('photograph-volcan'));assert.equal(style.color,light?'rgb(255, 255, 255)':'rgb(0, 0, 0)');const subtleShadow=await fig.evaluate(e=>e.classList.contains('photograph-soporte'));if(subtleShadow)assert.notEqual(style.shadow,'none');else assert.equal(style.shadow,'none');
      const hovered=await fig.locator('.photograph-frame').boundingBox(),hoveredScroll=await page.evaluate(()=>scrollY);assert.deepEqual({...hovered,y:hovered.y+hoveredScroll},{...initial,y:initial.y+initialScroll},'Hover causes no layout shift');
      const name=await fig.locator('.product-name').boundingBox();assert.ok(name.x>hovered.x&&name.x<hovered.x+30);const topLeft=await fig.evaluate(e=>e.classList.contains('photograph-volcan'));if(topLeft)assert.ok(name.y>hovered.y&&name.y+name.height<hovered.y+65,'Tramuntana at upper-left');else assert.ok(name.y+name.height<hovered.y+hovered.height&&name.y>hovered.y+hovered.height-50,'Name inside lower-left image corner');
      const category=fig.locator('.product-category'),categoryBox=await category.boundingBox();assert.ok(categoryBox.y+categoryBox.height<name.y,'Classification above the product name');
      const categoryStyle=await category.evaluate(e=>({size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight}));assert.deepEqual(categoryStyle,{size:'9px',weight:light?'300':'600'});assert.equal(await fig.locator('.product-name').evaluate(e=>getComputedStyle(e).fontWeight),light?'300':'600');if(!light){assert.equal(await fig.locator('.product-name').evaluate(e=>getComputedStyle(e).fontSynthesis),'none');assert.equal(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Montserrat'&&f.weight==='600'&&f.status==='loaded')),true,'Real SemiBold 600 is loaded');}
      const categories={Tramuntana:['PIEZA GASTRONÓMICA','CULINARY OBJECT'],Binari:['APLIQUE','WALL LIGHT'],Fita:['SEÑALÉTICA','SIGNAGE'],Cleda:['ACCESORIO DE BAÑO','BATHROOM ACCESSORY']};
      const product=await fig.locator('.product-name').innerText();assert.equal(await category.innerText(),categories[product][lang==='en'?1:0]);await fig.locator('.photograph-frame').screenshot({path:out+'/'+profile.name+'-'+lang+'-'+product+'.png'});
      await page.mouse.move(profile.width-1,1);await page.waitForTimeout(profile.reduced?30:400);assert.equal(await caption.evaluate(e=>getComputedStyle(e).opacity),'0');
     }
    }
    if(overlay){
     await page.locator('.header-scroll').focus();
     for(const figure of ['photograph-volcan','photograph-pool','photograph-tramuntana','photograph-soporte']){
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('photograph')),true);assert.equal(await page.locator('.'+figure).evaluate(e=>document.activeElement===e),true);await page.waitForTimeout(profile.reduced?30:400);assert.equal(await page.locator('.'+figure+' figcaption').evaluate(e=>getComputedStyle(e).opacity),'1');
     }
     await page.evaluate(()=>{document.activeElement.blur();scrollTo(0,0);});await page.waitForTimeout(profile.reduced?30:400);
    }
    if(profile.width===390){
     const screenshot=await page.screenshot({path:out+'/'+profile.name+'-'+lang+'-'+version+'.png',fullPage:true,animations:'disabled'});
     if(version==='before')mobileImage=screenshot;else assert.deepEqual(screenshot,mobileImage,'Mobile remains pixel-for-pixel unchanged');
    }
    if(version==='after'&&desktop&&!profile.touch){await page.locator('.invitation').screenshot({path:out+'/'+profile.name+'-'+lang+'-text.png'});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/'+profile.name+'-'+lang+'-page.png',fullPage:true});}
    if(version==='after')assert.equal(font600Requests>0,overlay,'SemiBold loads only for desktop overlays, never on mobile/touch fallback');assert.deepEqual(errors,[]);cases++;
   }finally{await context.close();}
  }
 }
 console.log('PASS '+cases+' visual cases: ES/EN 1440/1920/390, identical mobile pixels, unchanged photo geometry/typography, narrower centred column, centred heading and left-aligned paragraphs, two-line hover/focus labels with exact per-photo colour, position and real SemiBold 600, touch fallback, reduced motion, no real requests. Screenshots: '+out);
}finally{await browser.close();}
