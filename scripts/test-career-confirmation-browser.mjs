// Entire flow uses local SQLite and intercepted providers; no real email, tokens or contacts.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
import {handleRegistration,withdrawCareerConsent} from '../server/registrations.js';
import legal from '../legal/content.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const origin='https://cimstudio.es',out=process.env.CIM_CAREER_SCREENSHOTS||'/tmp/cim-career-confirmation';mkdirSync(out,{recursive:true});let count=0;
const scenarios=['confirmed','already','invalid','missing','malformed','withdrawn','db_error','http_error','network','malformed_response','disabled','withdraw_error'];
try{for(const width of [1440,390])for(const lang of ['es','en'])for(const scenario of scenarios){
 const s=await fixture();Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:origin});const mails=[],errors=[];let posts=0,recover=false,withdrawFail=true;
 const req=(path,body)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});
 const fetcher=async(url,options)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'cimstudio.es',action:'careers'});assert.equal(url,'https://api.resend.com/emails');mails.push(JSON.parse(options.body));return Response.json({id:'simulation-'+mails.length});};
 const create=()=>handleRegistration(req('/api/careers',{...s.data,language:lang,legalVersion:legal.version}),s.env,'careers',fetcher);
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
  assert.equal(u.origin,origin,'No external requests');
  if(u.pathname==='/api/config')return route.fulfill({json:{enabled:{subscribe:false,samples:false,careers:true},siteKey:'simulation',verified:false,siteLive:false,legalVersion:legal.version,legal:null}});
  if(u.pathname==='/api/careers'){
   const response=await handleRegistration(req(u.pathname,JSON.parse(r.postData())),s.env,'careers',fetcher);return route.fulfill({status:response.status,json:await response.json()});
  }
  if(u.pathname==='/api/careers/unsubscribe'){
   posts++;assert.equal(r.method(),'POST');const data=JSON.parse(r.postData());assert.match(data.token,/^[a-f0-9]{64}$/);assert.ok(!r.headers().referer?.includes('#'));
   if(!recover&&scenario==='http_error')return route.fulfill({status:503,json:{error:'unavailable'}});
   if(!recover&&scenario==='network')return route.abort('failed');
   if(!recover&&scenario==='malformed_response')return route.fulfill({json:{ok:true}});
   if(scenario==='withdraw_error'&&data.action==='unsubscribe'&&withdrawFail){withdrawFail=false;return route.abort('failed');}
   const response=await withdrawCareerConsent(req(u.pathname,data),s.env,new Date(),null,fetcher);return route.fulfill({status:response.status,json:await response.json()});
  }
  assert.equal(r.method(),'GET');const name=u.pathname==='/'?'index.html':u.pathname.endsWith('/')?u.pathname.slice(1)+'index.html':u.pathname.slice(1);
  return route.fulfill({body:readFileSync('public/'+name),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});
 });
 if(scenario==='confirmed'){
  await page.goto(origin+'/');await page.locator(`[data-lang=${lang}]`).click();await page.locator('[data-open=careers-dialog]').click();
  assert.equal(await page.locator('#careers-title').innerText(),lang==='es'?'Forma parte de nuestro equipo.':'Join our team.');
  assert.equal(await page.locator('#careers-dialog [data-i18n=careersDetails]').innerText(),lang==='es'?'Si te gustaría trabajar con nosotras, déjanos tu email. Cuando tengamos una nueva oportunidad en el estudio, serás de las primeras personas en saberlo.':"If you'd like to work with us, leave us your email. When a new opportunity opens up at the studio, you'll be among the first to hear about it.");
  await page.locator('#careers-email').fill(s.data.email);await page.locator('[name=careers_consent]').check();await page.locator('#careers-dialog [type=submit]').click();await page.waitForFunction(()=>document.getElementById('careers-response-dialog').open);
  assert.equal(mails.length,1);await page.locator('#careers-response-dialog').screenshot({path:`${out}/${width}-${lang}-form.png`});
 }else assert.equal((await create()).status,202);
 const email=mails[0];assert.ok(email.html);writeFileSync(`${out}/${lang}-email.html`,email.html);
 const link=email.text.match(/https:\/\/[^\s]+/)[0],token=new URL(link).hash.slice(1);assert.match(token,/^[a-f0-9]{64}$/);
 if(scenario==='already')await withdrawCareerConsent(req('/api/careers/unsubscribe',{token,action:'confirm'}),s.env,new Date(),null,fetcher);
 if(scenario==='withdrawn')await withdrawCareerConsent(req('/api/careers/unsubscribe',{token,action:'unsubscribe'}),s.env,new Date(),null,fetcher);
 if(scenario==='db_error')s.careers.sqlite.exec("CREATE TRIGGER fail_confirm BEFORE UPDATE ON registrations BEGIN SELECT RAISE(ABORT,'simulated persistence failure'); END");
 if(scenario==='disabled')s.env.CAREERS_ENABLED='false';
 const url=new URL(link);if(scenario==='invalid')url.hash='b'.repeat(64);if(scenario==='missing')url.hash='';if(scenario==='malformed')url.hash='invalid';
 await page.goto(url.href);await page.waitForFunction(()=>document.querySelector('main').getAttribute('aria-busy')==='false');
 assert.equal(await page.evaluate(()=>location.hash),'');assert.equal(await page.locator('html').getAttribute('lang'),lang);
 const success=['confirmed','already','withdraw_error'].includes(scenario);assert.equal(await page.locator('[data-panel=confirmed]').isVisible(),success);
 assert.equal(posts,['missing','malformed'].includes(scenario)?0:1);
 if(success){
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');assert.equal(mails.length,2);
  assert.equal(await page.locator('[data-panel=confirmed] h1').innerText(),lang==='es'?'¡Gracias por querer formar parte de nuestro equipo!':'Thank you for wanting to join our team!');
  assert.equal(await page.locator('[data-copy=confirmed]').innerText(),lang==='es'?'Tu correo electrónico se ha confirmado correctamente.':'Your email address has been successfully confirmed.');
  for(const a of await page.locator('[data-panel=confirmed] a').all())assert.equal(await a.getAttribute('href'),origin+'/');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  assert.equal(await page.locator('h1').last().evaluate(e=>getComputedStyle(e).fontFamily.includes('Montserrat')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(scenario==='confirmed')await page.screenshot({path:`${out}/${width}-${lang}-confirmed.png`,fullPage:true});
  await page.locator(`[data-lang=${lang==='es'?'en':'es'}]`).click();assert.equal(posts,1,'Changing language must not confirm again');
  await page.locator('[data-action=unsubscribe]').click();await page.waitForFunction(()=>document.querySelector('main').getAttribute('aria-busy')==='false');
  if(scenario==='withdraw_error'){assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');await page.locator('[data-action=retry]').click();await page.waitForFunction(()=>document.querySelector('main').getAttribute('aria-busy')==='false');}
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'withdrawn');assert.equal(mails.length,2);
 }else{
  assert.equal(mails.length,1);assert.notEqual(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');
  if(scenario==='disabled'){assert.equal(await page.locator('[data-action=unsubscribe]').isVisible(),true);await page.locator('[data-action=unsubscribe]').click();await page.waitForFunction(()=>document.querySelector('main').getAttribute('aria-busy')==='false');assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'withdrawn');}
  if(['http_error','network','db_error'].includes(scenario)){
   if(scenario==='network')await page.screenshot({path:`${out}/${width}-${lang}-error.png`,fullPage:true});
   recover=true;if(scenario==='db_error')s.careers.sqlite.exec('DROP TRIGGER fail_confirm');
   await page.locator('[data-action=retry]').click();await page.waitForFunction(()=>document.querySelector('main').getAttribute('aria-busy')==='false');assert.equal(await page.locator('[data-panel=confirmed]').isVisible(),true);assert.equal(mails.length,2);
  }
 }
 assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);assert.deepEqual(errors,[]);count++;
 }finally{await context.close();s.close();}
}console.log(`PASS ${count} full local career flows: ES/EN 1440/390, form/mail/personal link/D1 confirmation, idempotency, withdrawal, invalid tokens, failures and explicit recovery. No real services contacted.`);}finally{await browser.close();}
