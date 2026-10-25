// All providers intercepted; only fictional data and local in-memory databases.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
import {handleRegistration} from '../server/registrations.js';
import legal from '../legal/content.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CIM_SCREENSHOT_DIR||'/tmp/cim-samples-response';mkdirSync(out,{recursive:true});
const origin='https://cimstudio.es',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of ['accepted','receipt_rejected','admin_rejected','both_rejected','receipt_timeout','pending','unavailable','network','challenge','unrecorded_success']){
  const s=await fixture(),context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500}),errors=[];let posts=0;const destinations=[];
  Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:origin});
  try{
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
    assert.equal(url.origin,origin);if(url.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:true,careers:false},siteKey:'simulation-only',verified:true,siteLive:false,legalVersion:legal.version,legal:null}});
    if(url.pathname==='/api/samples'){
     posts++;
     if(scenario==='network')return route.abort('failed');
     if(scenario==='unavailable')return route.fulfill({status:503,json:{error:'unavailable'}});
     if(scenario==='unrecorded_success')return route.fulfill({status:202,json:{ok:true,recorded:false,receiptMailState:'accepted'}});
     if(scenario==='pending')return route.fulfill({status:202,json:{ok:true,recorded:true,mail:'pending',mailState:'pending',receiptMailState:'pending',deliveryVerified:false}});
     const response=await handleRegistration(new Request(req.url(),{method:'POST',headers:{...req.headers(),'CF-Connecting-IP':'192.0.2.1'},body:req.postData()}),s.env,'samples',async(target,options)=>{
      if(target.includes('siteverify'))return Response.json({success:scenario!=='challenge',hostname:'cimstudio.es',action:'samples'});
      assert.equal(target,'https://api.resend.com/emails');const payload=JSON.parse(options.body),kind=payload.to[0]==='admin@cimstudio.es'?'admin':'receipt';destinations.push(kind);
      if(scenario===kind+'_rejected'||scenario==='both_rejected')return new Response('SIMULATED REJECTION',{status:422});
      if(scenario==='receipt_timeout'&&kind==='receipt')throw Error('SIMULATED NO DELIVERY PROOF');
      return Response.json({id:'simulation-'+kind});
     });
     const body=await response.json();
     if(scenario!=='challenge'){assert.equal(body.recorded,true);assert.equal(body.deliveryVerified,false);assert.equal(s.forms.sqlite.prepare("SELECT COUNT(*) n FROM registrations WHERE kind='samples' AND state='active'").get().n,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registration_mail').get().n,2);assert.deepEqual(destinations,['admin','receipt']);assert.equal(body.mail,scenario==='accepted'?'accepted':'pending');assert.equal(body.receiptMailState,['accepted','admin_rejected'].includes(scenario)?'accepted':scenario==='receipt_timeout'?'uncertain':'rejected');}
     return route.fulfill({status:response.status,json:body});
    }
    const file='public'+(url.pathname==='/'?'/index.html':url.pathname);return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream',body:readFileSync(file)});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.cimFormSettings);await page.locator('[data-lang='+lang+']').click();await page.locator('[data-open=samples-dialog]').click();await page.waitForFunction(()=>window.turnstile);
   const form=page.locator('form[data-form-kind=samples]');
   for(const [field,value] of Object.entries({name:'Fictional professional',email:'sample@example.test',company:'Fictional studio',shippingAddress:'Test street 1',postalCode:'00000',city:'Test city',province:'Test region',country:'Test country'}))await form.locator('[name='+field+']').fill(value);
   await form.locator('[name=discipline]').selectOption('architecture');await form.locator('[type=submit]').click();assert.equal(posts,0,'consent is mandatory and unchecked');await form.locator('[name=contact_consent]').check();await form.locator('[type=submit]').click();
   const dialog=page.locator('#samples-response-dialog'),recorded=!['network','unavailable','challenge','unrecorded_success'].includes(scenario);
   if(recorded){
    await page.waitForFunction(()=>document.getElementById('samples-response-dialog').open);assert.equal(await page.locator('#samples-dialog').evaluate(e=>e.open),false);assert.equal(await page.locator('#subscription-pending-dialog').evaluate(e=>e.open),false);
    const mode=['accepted','admin_rejected'].includes(scenario)?'accepted':'pending',active=dialog.locator('[data-samples-response='+mode+']'),inactive=dialog.locator('[data-samples-response='+(mode==='accepted'?'pending':'accepted')+']');
    assert.equal(await dialog.getAttribute('aria-describedby'),await active.getAttribute('id'));assert.equal(await active.getAttribute('aria-hidden'),'false');assert.equal(await active.evaluate(e=>e.inert),false);assert.equal(await inactive.isVisible(),false);assert.equal(await inactive.evaluate(e=>e.inert),true);
    assert.equal(await dialog.locator('h2').textContent(),lang==='es'?'Hemos recibido tu solicitud.':'We have received your request.');assert.equal(await active.locator('a').first().getAttribute('href'),mode==='accepted'?'mailto:notificaciones@envios.cimstudio.es':'mailto:admin@cimstudio.es');
    assert.match(await active.textContent(),mode==='accepted'?(lang==='es'?/Tu respuesta llegará a CIM Studio/:/Your reply will reach CIM Studio/):(lang==='es'?/No es necesario repetirla/:/There is no need to submit it again/));
    assert.equal(await form.locator('.status').textContent(),'','no simultaneous inline confirmation');
    if(mode==='accepted'){assert.equal(await active.locator('.dialog-intro').count(),5);assert.equal(await active.locator('.samples-inbox-prompt').textContent(),lang==='es'?'Revisa tu bandeja de entrada.':'Check your inbox.');assert.equal(await active.locator('[data-i18n=samplesResponseThanks]').textContent(),lang==='es'?'Gracias por tu interés en nuestras muestras cerámicas.':'Thank you for your interest in our ceramic samples.');assert.equal(await active.locator('a').first().textContent(),'notificaciones@envios.cimstudio.es');}
    if(mode==='accepted'){const help=active.locator('.samples-delivery-help');assert.equal(await help.textContent(),lang==='es'?'¿No has recibido el correo? Contacta a admin@cimstudio.es.':"Haven't received the email? Contact us at admin@cimstudio.es.");assert.equal(await help.locator('a').getAttribute('href'),'mailto:admin@cimstudio.es');assert.equal(await help.evaluate(e=>getComputedStyle(e).fontSize),'11px');assert.equal(await help.evaluate(e=>getComputedStyle(e).color),'rgb(41, 42, 38)');assert.equal(await active.locator('.dialog-intro').last().getAttribute('class'),'dialog-intro samples-delivery-help');}
    const style=await dialog.evaluate(e=>{const n=document.getElementById('subscription-pending-dialog'),a=getComputedStyle(e),b=getComputedStyle(n);return {samePadding:a.padding===b.padding,sameBackground:a.backgroundColor===b.backgroundColor,sameTitle:getComputedStyle(e.querySelector('h2')).font===getComputedStyle(n.querySelector('h2')).font};});assert.deepEqual(style,{samePadding:true,sameBackground:true,sameTitle:true});assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);
    if(['accepted','admin_rejected'].includes(scenario))await page.screenshot({path:out+'/samples-'+width+'-'+lang+'-'+mode+'.png',fullPage:true});
    if(scenario==='accepted')await dialog.locator('[data-samples-response-close]').click();else if(scenario==='admin_rejected')await page.keyboard.press('Escape');else await dialog.locator('[data-close]').click();
    assert.equal(await dialog.evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.open),'samples-dialog');
   }else{
    await page.waitForFunction(key=>document.querySelector('form[data-form-kind=samples] .status').dataset.message===key,scenario==='challenge'?'challenge':'unavailable');assert.equal(await dialog.evaluate(e=>e.open),false);assert.equal(await form.locator('[name=email]').inputValue(),'sample@example.test');
   }
   assert.equal(posts,1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);cases++;
  }finally{await context.close();s.close();}
 }
 console.log('PASS',cases,'sample response cases: ES/EN desktop/mobile, two independent emails, durable registration, accepted/pending/rejected/uncertain mail, no delivery claim, errors, consent and accessible modal. All providers simulated.');
}finally{await browser.close();}
