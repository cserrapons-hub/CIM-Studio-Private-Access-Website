// Local Pages runtime only. No subscriptions, API requests or external services.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.CIM_WELCOME_ORIGIN||'http://127.0.0.1:8795';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use a local Pages runtime only');
const out=process.env.CIM_WELCOME_SCREENSHOTS||'/tmp/cim-subscription-welcome';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const width of [1440,768,390])for(const language of ['es','en'])for(const path of ['/bienvenido','/bienvenido/']){
  const context=await browser.newContext({viewport:{width,height:900}}),errors=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());assert.equal(url.origin,origin,'No external request');assert.ok(!url.pathname.startsWith('/api/'),'No API calls');return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origin+path);assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,'/bienvenido');
  assert.ok(response.headers()['content-security-policy']);assert.match(response.headers()['x-robots-tag'],/noindex/);
  assert.equal(await page.locator('html').getAttribute('lang'),'es');
  await page.locator('[data-lang='+language+']').click();
  assert.equal(await page.locator('h1').textContent(),language==='es'?'Bienvenido a nuestro universo.':'Welcome to our universe.');
  const expected=language==='es'?['Tu suscripción se ha confirmado correctamente.','A partir de ahora, serás de los primeros en descubrir nuestras nuevas piezas y colecciones.','Gracias por formar parte de CIM Studio.']:['Your subscription has been successfully confirmed.',"From now on, you'll be among the first to discover our new pieces and collections.",'Thank you for being part of CIM Studio.'];
  assert.deepEqual(await page.locator('main p').allTextContents(),expected);
  assert.equal(await page.locator('form, dialog, nav').count(),0);assert.equal(await page.locator('button').count(),2,'Language controls only');
  await page.evaluate(()=>document.fonts.ready);
  const visual=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,background:getComputedStyle(document.documentElement).backgroundColor,color:getComputedStyle(document.documentElement).color,font:getComputedStyle(document.body).fontFamily,loaded:document.fonts.check('300 13px Montserrat'),logo:document.querySelector('img').complete&&document.querySelector('img').naturalWidth>0}));
  assert.equal(visual.overflow,false);assert.equal(visual.background,'rgb(247, 246, 244)');assert.equal(visual.color,'rgb(41, 42, 38)');assert.ok(visual.font.includes('Montserrat'));assert.equal(visual.loaded,true);assert.equal(visual.logo,true);assert.deepEqual(errors,[]);
  if(path==='/bienvenido')await page.screenshot({path:out+'/'+language+'-'+width+'.png',fullPage:true});
  await context.close();cases++;
 }
 console.log('PASS '+cases+' local Pages cases: both URL variants, ES/EN, desktop/tablet/mobile, exact copy, logo/font, CSP, no overflow, no API/external requests.');
}finally{await browser.close();}
