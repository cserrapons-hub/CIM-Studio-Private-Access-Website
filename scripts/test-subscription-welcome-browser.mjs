// Local Pages runtime only. No subscriptions, API requests or external services.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.CIM_WELCOME_ORIGIN||'http://127.0.0.1:8795';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use a local Pages runtime only');
const out=process.env.CIM_WELCOME_SCREENSHOTS||'/tmp/cim-subscription-welcome';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const [width,height] of [[1440,900],[768,900],[390,844],[390,360]])for(const language of ['es','en'])for(const path of ['/bienvenido','/bienvenido/']){
  const context=await browser.newContext({viewport:{width,height}}),errors=[];
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
  const layout=await page.evaluate(()=>{const text=document.querySelector('main').getBoundingClientRect(),logo=document.querySelector('.welcome-brand').getBoundingClientRect();return {centre:(text.top+text.bottom)/2,logoBottom:logo.bottom,textTop:text.top,textBottom:text.bottom,height:innerHeight,scrollHeight:document.documentElement.scrollHeight};});
  assert.ok(layout.textTop>layout.logoBottom+30,'Text separate from logo');
  const refinement=await page.evaluate(()=>{const logo=document.querySelector('.welcome-brand img').getBoundingClientRect(),title=document.querySelector('h1').getBoundingClientRect(),rule=document.querySelector('.welcome-rule').getBoundingClientRect(),style=getComputedStyle(document.querySelector('main p'));return {lineCentre:(rule.top+rule.bottom)/2,gapCentre:(logo.bottom+title.top)/2,lineX:(rule.left+rule.right)/2,logoTop:logo.top,weight:style.fontWeight,size:parseFloat(style.fontSize),regular:[...document.fonts].some(f=>f.family==='Montserrat'&&f.weight==='400'&&f.status==='loaded')};});
  assert.ok(refinement.lineCentre>layout.logoBottom&&refinement.lineCentre<layout.textTop,'Rule remains between logo and title');
  assert.ok(Math.abs(refinement.lineX-width/2)<1,'Rule horizontally centred');
  assert.equal(refinement.weight,'400');assert.equal(refinement.size,13);assert.equal(refinement.regular,true,'Real self-hosted Montserrat Regular');
  const group=await page.locator('.welcome-content').boundingBox();if(height>=800)assert.ok(Math.abs(group.y+group.height/2-height/2)<1,'Entire logo/rule/text group vertically centred');
  const gaps=await page.evaluate(()=>{const logo=document.querySelector('.welcome-brand img').getBoundingClientRect(),rule=document.querySelector('.welcome-rule').getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();return [rule.top-logo.bottom,main.top-rule.bottom];});assert.ok(Math.abs(gaps[0]-52)<1);assert.ok(Math.abs(gaps[1]-40)<1,'Internal spacing remains independent of viewport');
  assert.ok(layout.textBottom<=layout.scrollHeight,'Short screens scroll naturally without cropped content');
  if(path==='/bienvenido')await page.screenshot({path:out+'/'+language+'-'+width+'-'+height+'.png',fullPage:true});
  await context.close();cases++;
 }
 console.log('PASS '+cases+' local Pages cases: both URL variants, ES/EN, desktop/tablet/mobile, exact copy, logo/font, CSP, no overflow, no API/external requests.');
}finally{await browser.close();}
