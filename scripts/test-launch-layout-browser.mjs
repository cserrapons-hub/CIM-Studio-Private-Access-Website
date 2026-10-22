// Local static UI only; all network requests intercepted, no real forms submitted.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const [width,height] of [[1920,1080],[1440,900],[1101,900],[768,1024],[390,844],[320,740]])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());assert.equal(u.origin,'https://layout.example.test');
    if(u.pathname==='/api/config')return route.fulfill({contentType:'application/json',body:JSON.stringify({enabled:{subscribe:false,samples:false,careers:false},verified:false})});
    const name=u.pathname==='/'?'/index.html':u.pathname;
    return route.fulfill({contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream',body:readFileSync('public'+name)});
   });
   await page.goto('https://layout.example.test/');await page.click('[data-lang='+lang+']');await page.evaluate(()=>document.fonts.ready);
   const geometry=await page.evaluate(()=>{
    const r=q=>{const b=document.querySelector(q).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
    return {shell:r('.page-shell'),text:r('.invitation'),volcan:r('.photograph-volcan'),pool:r('.photograph-pool'),lamp:r('.photograph-tramuntana'),support:r('.photograph-soporte'),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(geometry.overflow,false);assert.ok(geometry.shell.width<=1426.1);
   assert.ok(Math.abs(geometry.volcan.left-geometry.shell.left)<1,'left image reaches shell edge');assert.ok(Math.abs(geometry.lamp.right-geometry.shell.right)<1,'right image reaches shell edge');
   assert.ok(Math.abs((geometry.text.left+geometry.text.right)/2-width/2)<1,'independent text column stays centred');
   assert.ok(Math.abs(geometry.lamp.width-geometry.support.width)<1);assert.ok(geometry.support.top>=geometry.lamp.bottom+7);assert.ok(geometry.pool.top>=geometry.volcan.bottom+7);
   if(width>1100){assert.ok(geometry.pool.right<geometry.text.left);assert.ok(geometry.text.right<geometry.lamp.left);}
   await page.click('[data-open=samples-dialog]');assert.equal(await page.locator('#samples-title').textContent(),lang==='es'?'Solicita muestras gratuitas':'Request free samples');
   assert.equal(await page.locator('#samples-dialog .dialog-intro').count(),1);assert.equal(await page.locator('#samples-dialog [name=project]').count(),0);
   assert.equal(await page.locator('#samples-dialog select[name=discipline] option[value]:not([value=""])').count(),5);
   for(const name of ['shippingAddress','postalCode','city','province','country'])assert.equal(await page.locator('#samples-dialog [name='+name+']').getAttribute('required'),'');
   assert.equal(await page.locator('#samples-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);assert.deepEqual(errors,[]);cases++;
   if(lang==='es'&&[1920,1440,390].includes(width)){await page.keyboard.press('Escape');await page.screenshot({path:'/tmp/cim-launch-layout-'+width+'.png',fullPage:true});}
  }finally{await context.close();}
 }
 console.log('PASS',cases,'ES/EN layout/sample-form cases; measured photo edges, text centre, gaps, required fields and no overflow. No real services contacted.');
}finally{await browser.close();}
