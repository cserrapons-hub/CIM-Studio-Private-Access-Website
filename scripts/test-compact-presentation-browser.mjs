// Before/after typography only. Intercept every request; never submit forms.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const before=execFileSync('git',['show','420ba63:editorial.css']);
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-compact-presentation';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const width of [1440,768,390])for(const lang of ['es','en']){
  let baseline;
  for(const version of ['before','after']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600}),errors=[];
   try{
    await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());assert.equal(r.method(),'GET');assert.equal(u.origin,'https://layout.example.test');
     if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:false},verified:false,siteKey:null}});
     const name='public'+(u.pathname==='/'?'/index.html':u.pathname),body=version==='before'&&u.pathname==='/editorial.css'?before:readFileSync(name);
     return route.fulfill({body,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://layout.example.test');await page.locator('[data-lang='+lang+']').click();await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{for(const e of document.querySelectorAll('.header-scroll,.editorial-scroll'))for(const a of e.getAnimations()){a.pause();a.currentTime=0;}});
    const measure=await page.evaluate(()=>{
     const rect=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
     const style=selector=>{const s=getComputedStyle(document.querySelector(selector));return {size:parseFloat(s.fontSize),weight:s.fontWeight,align:s.textAlign};};
     return {fixed:['.brand','.photograph-volcan','.photograph-tramuntana','.photograph-pool','.photograph-soporte','.editorial-scroll'].map(rect),block:rect('.invitation'),heading:style('.invitation h1'),paragraph:style('.intro'),copy:document.querySelector('.invitation').innerText,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(version==='before')baseline=measure;else{
     assert.deepEqual(measure.fixed,baseline.fixed,'Logo, photos and arrow unchanged');assert.equal(measure.block.x,baseline.block.x);assert.equal(measure.block.y,baseline.block.y);assert.equal(measure.block.width,baseline.block.width);assert.ok(measure.block.height<baseline.block.height,'Presentation is more compact');
     assert.ok(Math.abs(measure.heading.size/baseline.heading.size-.75)<.001,'Heading reduced by 25%');assert.ok(measure.paragraph.size<=baseline.paragraph.size);assert.ok(measure.paragraph.size>=(width<600?12:11.5),'Readable floor');assert.equal(measure.paragraph.weight,'400');assert.equal(measure.heading.align,width>1100?'center':'left');assert.equal(measure.paragraph.align,width>1100?'center':'left');assert.equal(measure.copy,baseline.copy);assert.equal(measure.overflow,false);
     const arrow=measure.fixed.at(-1);assert.ok(Math.abs(measure.block.x+measure.block.width/2-arrow.x-arrow.width/2)<1,'Block stays aligned with arrow');
    }
    await page.locator('.invitation').screenshot({path:out+'/'+width+'-'+lang+'-'+version+'.png'});assert.deepEqual(errors,[]);cases++;
   }finally{await context.close();}
  }
 }
 console.log('PASS '+cases+' before/after cases, ES/EN desktop/tablet/mobile: 25% smaller headings, readable Regular paragraphs, compact spacing, responsive alignment, unchanged copy, photos and arrow, no submissions.');
}finally{await browser.close();}
