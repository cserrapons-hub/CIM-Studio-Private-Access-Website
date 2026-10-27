// All APIs/providers are intercepted and D1 is local SQLite. No real email or subscriptions.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
import {handleRegistration} from '../server/registrations.js';
import legal from '../legal/content.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
const out=process.env.CIM_CAREERS_MODAL_SCREENSHOTS||'/tmp/cim-careers-response-modal';mkdirSync(out,{recursive:true});let cases=0;
const scenarios=['accepted','rejected','uncertain','pending','missing_mail_state','contradictory_mail','not_required','missing_record','http_error','network','bad_json','validation','challenge','storage_error','rate','unexpected_200'];
try{for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of scenarios){
 const s=await fixture();Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:'https://cimstudio.es',MAIL_FROM:'notificaciones@envios.cimstudio.es'});let posts=0,mails=0;const errors=[];
 if(scenario==='storage_error')s.careers.sqlite.exec("CREATE TRIGGER fail_registration BEFORE INSERT ON registrations BEGIN SELECT RAISE(ABORT,'simulated persistence failure'); END");
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
  assert.equal(u.origin,'https://cimstudio.es');
  if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:true},siteKey:'simulation-site',verified:false,siteLive:false,legalVersion:legal.version,legal:null}});
  if(u.pathname==='/api/careers'){
   posts++;assert.equal(r.method(),'POST');
   if(scenario==='network')return route.abort('failed');
   if(scenario==='bad_json')return route.fulfill({status:202,body:'not JSON',contentType:'application/json'});
   if(['http_error','validation','rate'].includes(scenario))return route.fulfill({status:scenario==='http_error'?503:scenario==='rate'?429:400,json:{error:scenario==='validation'?'invalid':scenario==='rate'?'rate':'unavailable'}});
   if(['pending','missing_mail_state','contradictory_mail','not_required','missing_record','unexpected_200'].includes(scenario)){
    const body={ok:true,recorded:true,confirmationRequired:true,mail:'accepted',mailState:'accepted'};
    if(scenario==='pending'){body.mail='pending';body.mailState='pending';}
    if(scenario==='missing_mail_state')delete body.mailState;
    if(scenario==='contradictory_mail')body.mail='pending';
    if(scenario==='not_required')body.confirmationRequired=false;
    if(scenario==='missing_record')delete body.recorded;
    return route.fulfill({status:scenario==='unexpected_200'?200:202,json:body});
   }
   const request=new Request(r.url(),{method:'POST',headers:{...r.headers(),'CF-Connecting-IP':'192.0.2.1'},body:r.postData()});
   const response=await handleRegistration(request,s.env,'careers',async(url,options)=>{
    if(url.includes('siteverify'))return Response.json({success:scenario!=='challenge',hostname:'cimstudio.es',action:'careers'});
    assert.equal(url,'https://api.resend.com/emails');mails++;const payload=JSON.parse(options.body);assert.equal(payload.from,'notificaciones@envios.cimstudio.es');
    if(scenario==='uncertain')throw Error('simulated network error');
    return Response.json({id:'simulation-only'},{status:scenario==='rejected'?422:200});
   });
   return route.fulfill({status:response.status,json:await response.json()});
  }
  assert.equal(r.method(),'GET');const name=u.pathname==='/'?'index.html':u.pathname.slice(1);
  return route.fulfill({body:readFileSync('public/'+name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});
 });
 await page.goto('https://cimstudio.es/');await page.waitForFunction(()=>window.cimFormSettings);await page.locator(`[data-lang=${lang}]`).click();await page.locator('[data-open=careers-dialog]').click();
 const form=page.locator('[data-form-kind=careers]'),dialog=page.locator('#careers-response-dialog');
 await page.waitForFunction(()=>!document.querySelector('[data-form-kind=careers] [type=submit]').disabled);
 await form.locator('[type=submit]').click();assert.equal(posts,0,'email and consent are mandatory');
 await form.locator('[name=email]').fill('invalid-email');await form.locator('[name=careers_consent]').check();await form.locator('[type=submit]').click();assert.equal(posts,0,'invalid email must not be submitted');
 await form.locator('[name=email]').fill('candidate@example.test');await form.locator('[name=careers_consent]').uncheck();await form.locator('[type=submit]').click();assert.equal(posts,0,'independent careers consent is mandatory');await form.locator('[name=careers_consent]').check();
 await page.waitForFunction(()=>!document.querySelector('[data-form-kind=careers] [type=submit]').disabled);
 if(scenario==='accepted')await form.evaluate(e=>{e.requestSubmit();e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});else await form.locator('[type=submit]').click();
 if(scenario==='accepted'){
  await page.waitForFunction(()=>document.getElementById('careers-response-dialog').open);
  assert.equal(await dialog.locator('h2').innerText(),lang==='es'?'Solo falta un paso.':'Just one more step.');
  const paragraphs=await dialog.locator('.dialog-intro').allTextContents();assert.deepEqual(paragraphs,lang==='es'?[
   'Te hemos enviado un correo electrónico desde notificaciones@envios.cimstudio.es.',
   'Revisa tu bandeja de entrada y haz clic en el enlace de confirmación para que podamos avisarte cuando surjan nuevas oportunidades.',
   'Si no encuentras el correo, comprueba también la carpeta de spam.'
  ]:[
   'We have sent you an email from notificaciones@envios.cimstudio.es.',
   'Check your inbox and click the confirmation link so we can let you know when new opportunities arise.',
   'If you cannot find the email, please also check your spam folder.'
  ]);
  assert.equal(await dialog.locator('a').first().getAttribute('href'),'mailto:notificaciones@envios.cimstudio.es');
  assert.equal(await dialog.locator('.samples-delivery-help').textContent(),lang==='es'?'¿No has recibido el correo? Contacta a admin@cimstudio.es.':"Haven't received the email? Contact us at admin@cimstudio.es.");
  assert.equal(await dialog.locator('.samples-delivery-help a').getAttribute('href'),'mailto:admin@cimstudio.es');
  assert.equal(await form.locator('.status').textContent(),'');assert.equal(await form.locator('[name=email]').inputValue(),'');
  assert.equal(await dialog.locator('[data-careers-response-close]').innerText(),lang==='es'?'Entendido':'Got it');
  for(const id of (await dialog.getAttribute('aria-describedby')).split(' '))assert.equal(await dialog.locator('#'+id).count(),1);
  const styles=await dialog.evaluate(e=>{const other=document.getElementById('samples-response-dialog');const style=(x,pseudo)=>{const s=getComputedStyle(x,pseudo);return [s.padding,s.backgroundColor,s.color,s.fontFamily,s.maxHeight,s.animation,s.transition];};return {dialog:style(e),sample:style(other),backdrop:getComputedStyle(e,'::backdrop').backgroundColor,sampleBackdrop:getComputedStyle(other,'::backdrop').backgroundColor,title:getComputedStyle(e.querySelector('h2')).font,sampleTitle:getComputedStyle(other.querySelector('h2')).font,help:[...['font','margin','textAlign','color','overflowWrap']].map(k=>getComputedStyle(e.querySelector('.samples-delivery-help'))[k]),sampleHelp:[...['font','margin','textAlign','color','overflowWrap']].map(k=>getComputedStyle(other.querySelector('.samples-delivery-help'))[k])};});
  assert.deepEqual(styles.dialog,styles.sample);assert.equal(styles.backdrop,styles.sampleBackdrop);assert.equal(styles.title,styles.sampleTitle);assert.deepEqual(styles.help,styles.sampleHelp);
  const help=await dialog.locator('.samples-delivery-help').boundingBox(),button=await dialog.locator('[data-careers-response-close]').boundingBox(),rect=await dialog.boundingBox();assert.ok(Math.abs(rect.width-Math.min(540,width-36))<1);assert.ok(help.y>=button.y+button.height+19);assert.ok(Math.abs(help.x+help.width/2-rect.x-rect.width/2)<1);
  assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);await dialog.screenshot({path:`${out}/${width}-${lang}.png`});
  if(width===1440&&lang==='es')await dialog.locator('[data-careers-response-close]').click();else if(width===1440)await dialog.locator('[data-close]').click();else if(lang==='es')await page.keyboard.press('Escape');else await page.mouse.click(1,1);
  assert.equal(await dialog.evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'careers-dialog');
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');assert.equal(mails,1);
 }else{
  await page.waitForFunction(()=>document.querySelector('[data-form-kind=careers]').getAttribute('aria-busy')!=='true');
  assert.equal(await dialog.evaluate(e=>e.open),false);assert.ok((await form.locator('.status').textContent()).length>0);
  if(['pending','rejected','uncertain','missing_mail_state','contradictory_mail','unexpected_200'].includes(scenario))assert.equal(await form.locator('.status').getAttribute('data-message'),'recordedPendingMail');
  if(['http_error','network','bad_json','storage_error','missing_record'].includes(scenario))assert.equal(await form.locator('[name=email]').inputValue(),'candidate@example.test');
 }
 assert.equal(posts,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);assert.deepEqual(errors,[]);cases++;
 }finally{await context.close();s.close();}
}console.log(`PASS ${cases} careers response cases: ES/EN desktop/mobile, strict recorded+confirmation+mail acceptance gate, unchanged sample styling, all close controls/focus, no duplicate POST or automatic newsletter. All services simulated.`);}finally{await browser.close();}
