// Local browser simulation. Every network request is intercepted; never sends real mail.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/launch-fixture.mjs';
import {registrationTestPolicies} from '../server/registration-test-policy.js';
import {registrationTestConfiguration} from '../functions/api/controlled/registration-config.js';
import {handleRegistration,withdrawCareerConsent} from '../server/registrations.js';
import {onRequest as middleware} from '../functions/_middleware.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
try{
 for(const outcome of ['disabled','accepted','rejected','uncertain','pending'])for(const kind of ['samples','careers'])for(const lang of ['es','en'])for(const width of [1440,390]){
  const enabled=outcome!=='disabled';
  const s=await fixture();Object.assign(s.env,{REGISTRATIONS_TEST_ENABLED:enabled?'true':'false',SAMPLES_TEST_LEGAL_APPROVED:enabled?'true':'false',CAREERS_TEST_LEGAL_APPROVED:enabled?'true':'false',SAMPLES_VERIFIED:'false',CAREERS_VERIFIED:'false',MAIL_RECEIPTS_VERIFIED:'false'});
  const defs=Object.fromEntries(Object.entries(registrationTestPolicies).map(([k,v])=>[k,{...v,approved:enabled}]));
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(url.hostname==='challenges.cloudflare.com'){assert.equal(enabled,true);external.push(url.href);return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:(el,o)=>{window.testAction=o.action;return 1},getResponse:()=>window.testAction==='samples'?'sample-token':'career-token',remove:()=>{},reset:()=>{}};window.cimRegistrationTestReady();"});}
    assert.equal(url.origin,s.env.REGISTRATION_ORIGIN,'All other external requests are forbidden');
    const headers={...r.headers(),Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD),'CF-Connecting-IP':'192.0.2.1'};
    const request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}:{})});
    const response=await middleware({request,env:s.env,next:async()=>{
     if(url.pathname==='/api/controlled/career-preferences')return withdrawCareerConsent(request,s.env,new Date(),defs.careers,s.fetcher);
     if(url.pathname==='/api/controlled/registration-config')return registrationTestConfiguration(request,s.env,defs);
     if(url.pathname==='/api/controlled/'+kind)return handleRegistration(request,s.env,kind,(url,options)=>{if(url==='https://api.resend.com/emails'&&outcome!=='accepted')return Promise.resolve(new Response(null,{status:outcome==='rejected'?403:outcome==='uncertain'?500:429}));return s.fetcher(url,options);},new Date(),defs[kind]);
     const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
     return new Response(readFileSync('public'+name),{headers:{'Content-Type':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'}});
    }});
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   });
   await page.goto(s.env.REGISTRATION_ORIGIN+'/controlled/registrations/');
   await page.waitForFunction(()=>document.getElementById('policy-version').textContent.includes('samples-private-test-v1'));
   if(kind==='careers')await page.selectOption('#kind',kind);if(lang==='en')await page.click('[data-lang="en"]');
   await page.click('#privacy-link');assert.equal(await page.locator('#privacy-text').textContent(),defs[kind][lang].privacy);await page.click('#privacy-close');
   assert.equal(await page.locator('[name=consent]').isChecked(),false);assert.equal(await page.locator('[name=testData]').isChecked(),false);
   assert.equal(await page.locator('fieldset').evaluate(e=>e.disabled),!enabled);
   if(enabled){await page.waitForFunction(()=>Boolean(window.testAction));await page.fill('#email','owner@example.test');await page.check('[name=testData]');await page.check('[name=consent]');await page.click('[type=submit]');await page.waitForFunction(()=>/Solicitud guardada|Request saved|Prueba registrada|Test recorded/.test(document.getElementById('result').textContent));assert.match(await page.locator('#result').textContent(),outcome==='accepted'?/aceptados por Resend|accepted by Resend/:outcome==='rejected'?/rechazado|rejected/:outcome==='uncertain'?/no se puede acreditar|cannot be established/:/pendiente|needs checking/);assert.equal((kind==='samples'?s.forms:s.careers).sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);}else{assert.equal(external.length,0);assert.equal(s.calls.length,0);}
   if(outcome==='accepted'&&kind==='careers'){
    const receipt=JSON.parse(s.calls.find(call=>call.url==='https://api.resend.com/emails').options.body);
    const capability=receipt.text.match(/controlled\/registrations\/#([a-f0-9]{64})/)[1];
    await page.goto(s.env.REGISTRATION_ORIGIN+'/controlled/registrations/#'+capability);
    await page.waitForFunction(()=>!document.querySelector('[data-action=confirm]').disabled);
    if(lang==='en')await page.click('[data-lang=en]');
    assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending','GET must not confirm');
    await page.fill('#email','owner@example.test');await page.click('[data-action=confirm]');
    await page.waitForFunction(()=>/Acción procesada|Action processed/.test(document.getElementById('result').textContent));
    assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');
    await page.click('[data-action=confirm]');
    await page.waitForFunction(()=>!document.querySelector('[data-action=confirm]').disabled);
    const admin=s.calls.filter(call=>call.url==='https://api.resend.com/emails').map(call=>JSON.parse(call.options.body)).filter(mail=>mail.to.includes('admin@cimstudio.es'));
    assert.equal(admin.length,1);assert.ok(!admin[0].text.includes(capability));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);cases++;
  }finally{await context.close();s.close();}
 }
 console.log('Private registration browser simulations passed:',cases);
}finally{await browser.close();}
