// Local-only browser simulation. Build first; requires Playwright/Chromium and Node node:sqlite.
// All requests intercepted; provider and Turnstile are mocks. Never runs a real signup.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {newsletterTestPolicy,resolveNewsletterTestPolicy} from '../server/newsletter-test-policy.js';
import {newsletterTestEmailHash} from '../server/newsletter-test-allowlist.js';
import {newsletterTestConfiguration} from '../functions/api/controlled/newsletter-config.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';
import {observeNewsletter} from '../server/newsletter-observations.js';
import {verifyConsentEvidence} from '../server/getresponse-controlled.js';
import legal from '../legal/content.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),origin='https://cim-studio-test.pages.dev';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
let cases=0;
try{
 for(const scenario of ['disabled','accepted','allowlist','turnstile','campaign','contacts','persistence','browser_network'])for(const width of (['disabled','accepted'].includes(scenario)?[1920,1440,768,390]:[1440,390]))for(const lang of ['es','en']){
  const enabled=scenario!=='disabled';
  const sqlite=new DatabaseSync(':memory:');for(const name of ['0001_forms.sql','0006_newsletter_consent.sql','0007_newsletter_html_deliveries.sql','0008_launch_operations.sql','0009_newsletter_api_deliveries.sql'])sqlite.exec(readFileSync(root+'migrations/'+name,'utf8'));
  const db={prepare(sql){let args=[];return {sql,args:()=>args,bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.args())}));sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  const env={CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:origin,CONTROLLED_TEST_USER:'simulated-owner',CONTROLLED_TEST_PASSWORD:'simulation-password-at-least-32-characters',SITE_LIVE:'false',NEWSLETTER_OBSERVATIONS_ENABLED:enabled?'true':'false',GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:'simulation-subscriber-type',GETRESPONSE_API_KEY:'simulation-no-real-key',GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_API_REVIEWED:enabled?'true':'false',FORMS_ENABLED:'false',NEWSLETTER_ENABLED:'false',SAMPLES_ENABLED:'false',CAREERS_ENABLED:'false',NEWSLETTER_TEST_LEGAL_APPROVED:enabled?'true':'false',NEWSLETTER_PREPARATION_ENABLED:enabled?'true':'false',NEWSLETTER_CONTROLLED_SEND_ENABLED:enabled?'true':'false',FORMS_DB:db,AUDIT_HASH_SECRET:'simulation-only-audit-secret-at-least-32-characters',NEWSLETTER_DATA_KEY:btoa('n'.repeat(32)),NEWSLETTER_TEST_ALLOWLIST_SECRET:btoa('l'.repeat(32)),TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret'};
  env.NEWSLETTER_TEST_EMAIL_HASH=await newsletterTestEmailHash(env.NEWSLETTER_TEST_ALLOWLIST_SECRET,'owner@example.test');
  const policy=resolveNewsletterTestPolicy(env,enabled?{...newsletterTestPolicy,approved:true,version:'simulation-private-policy-v1'}:newsletterTestPolicy);
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500}),errors=[],external=[],posts=[];
  let providerCalls=0,turnstileCalls=0;
  try{
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    if(scenario==='browser_network'&&url.pathname==='/api/controlled/subscribe'){posts.push(JSON.parse(r.postData()));return route.abort('failed');}
    if(url.hostname==='challenges.cloudflare.com'){
     external.push(url.href);assert.equal(enabled,true,'Blocked draft must not load Turnstile');
     return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimPrivateNewsletterTurnstileReady();"});
    }
    assert.equal(url.origin,origin,'No other external destination allowed');
    const headers={...r.headers(),Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD),'CF-Connecting-IP':'192.0.2.1'};
    const request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}: {})});
    const next=async()=>{
     if(url.pathname==='/api/controlled/newsletter-config')return newsletterTestConfiguration(request,env,policy);
     if(url.pathname==='/api/controlled/newsletter-observation'){
      const input=JSON.parse(r.postData());
      return observeNewsletter(request,env,{policy,fetcher:async(target)=>{
       if(target.includes('/campaigns/'))return Response.json({campaignId:env.GETRESPONSE_CAMPAIGN_ID,name:'cim_studio_newsletter',optinTypes:{api:'double'}});
       return Response.json(input.phase==='after'?[{contactId:'simulation-contact',email:'owner@example.test',campaign:{campaignId:env.GETRESPONSE_CAMPAIGN_ID},createdOn:'2026-10-20T10:00:00Z',customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]}]:[]);
      }});
     }
     if(url.pathname==='/api/controlled/subscribe'){
      posts.push(JSON.parse(r.postData()));
      if(scenario==='allowlist')env.NEWSLETTER_TEST_EMAIL_HASH='0'.repeat(64);
      if(scenario==='persistence')sqlite.exec("CREATE TRIGGER fail_before_commit BEFORE INSERT ON newsletter_api_deliveries BEGIN SELECT RAISE(ABORT,'private failure'); END");
      return handleControlledNewsletter(request,env,{policy,fetcher:async(target,options)=>{
       if(target.includes('siteverify')){turnstileCalls++;return Response.json({success:scenario!=='turnstile',hostname:url.hostname,action:'subscribe'});}
       if(target==='https://api.getresponse.com/v3/campaigns/PL6jh'&&scenario==='campaign')return new Response(null,{status:401});
       if(target.includes('/contacts?')&&scenario==='contacts')return new Response(null,{status:503});
       if(target==='https://api.getresponse.com/v3/campaigns/PL6jh')return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
       if(target.startsWith('https://api.getresponse.com/v3/contacts?'))return Response.json([]);
       assert.equal(target,'https://api.getresponse.com/v3/contacts');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).customFieldValues.find(field=>field.customFieldId===env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID).value[0],lang==='en'?'profesional':'particular');providerCalls++;
       assert.equal(options.redirect,'manual');
       return new Response(null,{status:202});
      }});
     }
     const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
     return new Response(readFileSync(root+'public/'+name.replace(/^\//,'')),{headers:{'Content-Type':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'}});
    };
    const response=await middleware({request,env,next});
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/controlled/newsletter/');
   await page.waitForFunction(()=>document.getElementById('privacy-text').textContent.length>100);
   await page.locator('[data-lang='+lang+']').click();
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
   assert.equal(await page.locator('#consent-text').textContent(),newsletterTestPolicy[lang].consent);
   assert.equal(await page.locator('[name=consent]').isChecked(),false);
   assert.equal(await page.locator('[name=consent]').getAttribute('required'),'');
   await page.locator('#privacy-link').click();assert.equal(await page.locator('#test-privacy').evaluate(e=>e.open),true);
   assert.equal(await page.locator('#privacy-text').textContent(),newsletterTestPolicy[lang].privacy);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.keyboard.press('Escape');assert.equal(await page.locator('#test-privacy').evaluate(e=>e.open),false);
   if(!enabled){
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(external.length,0);assert.equal(posts.length,0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
   }else{
    await page.waitForFunction(()=>window.turnstile);
    assert.equal(await page.locator('[name=subscriberType]').inputValue(),'');
    await page.locator('[name=email]').fill('owner@example.test');await page.locator('[name=consent]').check();await page.locator('button[type=submit]').click();assert.equal(posts.length,0,'An audience is required');await page.locator('[name=consent]').uncheck();
    await page.selectOption('[name=subscriberType]',lang==='en'?'profesional':'particular');
    await page.locator('[name=email]').fill('owner@example.test');
    await page.locator('[data-observe=before]').click();await page.waitForFunction(()=>document.getElementById('observation-result').textContent.includes('\"phase\": \"before\"'));
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,1);
    await page.locator('button[type=submit]').click();assert.equal(posts.length,0,'Unchecked consent blocks submission');
    await page.locator('[name=consent]').check();await page.locator('button[type=submit]').click();
    if(scenario!=='accepted'){
     await page.waitForFunction(()=>/no se ha enviado a GetResponse|not submitted to GetResponse|No se ha recibido una respuesta válida|No valid response was received/.test(document.getElementById('result').textContent));
     assert.equal(providerCalls,0);assert.equal(posts.length,1);
     assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
     assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);cases++;continue;
    }
    try{await page.waitForFunction(()=>document.getElementById('result').textContent.includes(document.documentElement.lang==='es'?'GetResponse ha aceptado':'GetResponse accepted'),{},{timeout:8000});}catch(error){console.log({enabled,width,lang,providerCalls,turnstileCalls,posts:posts.length,result:await page.locator('#result').textContent(),errors});throw error;}
    assert.equal(providerCalls,1);assert.equal(turnstileCalls,1);assert.equal(posts.length,1);assert.equal(posts[0].language,lang);assert.equal(posts[0].legalVersion,'simulation-private-policy-v1');
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    await page.locator('[data-observe=after]').click();await page.waitForFunction(()=>document.getElementById('observation-result').textContent.includes('\"phase\": \"after\"'));
    const observed=JSON.parse(await page.locator('#observation-result').textContent());assert.equal(observed.founders,'pending');assert.equal(observed.confirmationVerified,false);assert.equal(observed.customConsentStored,true);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,2);
    const row=sqlite.prepare('SELECT * FROM newsletter_consent_requests').get();assert.ok(await verifyConsentEvidence(row,env.AUDIT_HASH_SECRET));assert.equal(row.consent_text,newsletterTestPolicy[lang].consent);
    assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.equal(legal.approved,false);cases++;
  }finally{await context.close();sqlite.close();}
 }
 console.log('PASS '+cases+' private newsletter browser cases: ES/EN, responsive acceptance and pre-persistence/network failure cases; blocked drafts make no external requests; simulated approved flow has mandatory unchecked consent, private notice, Turnstile and one signed API-accepted request (not DOI confirmation). Public legal approval remains false. Before/after API observations remain pending evidence. All providers mocked.');
}finally{await browser.close();}
