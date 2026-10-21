// Local-only diagnosis regression. All network requests intercepted; SQLite in memory.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,policy} from '../tests/helpers/launch-fixture.mjs';
import {observeNewsletter} from '../server/newsletter-observations.js';
import {newsletterTestConfiguration} from '../functions/api/controlled/newsletter-config.js';
import {onRequest as middleware} from '../functions/_middleware.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{
 for(const mode of ['contacts_403','storage_read','network','error_then_success'])for(const lang of ['es','en'])for(const width of [1440,390]){
  const s=await fixture();Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_PREPARATION_ENABLED:'false',NEWSLETTER_CONTROLLED_SEND_ENABLED:'false'});
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];let observations=0,reads=0;page.on('pageerror',e=>errors.push(e.message));
  if(mode==='storage_read')s.forms.sqlite.exec('DROP TABLE newsletter_observations');
  try{
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());assert.equal(url.origin,s.env.CONTROLLED_TEST_ORIGIN,'No external browser/Turnstile request allowed for observation-only mode');
    assert.ok(!url.pathname.includes('/subscribe'),'No subscription request may occur');
    if(url.pathname==='/api/controlled/newsletter-observation'){observations++;if(mode==='network')return route.abort();}
    const headers={...r.headers(),Authorization:'Basic '+btoa(s.env.CONTROLLED_TEST_USER+':'+s.env.CONTROLLED_TEST_PASSWORD),'CF-Connecting-IP':'192.0.2.1'};
    const request=new Request(r.url(),{method:r.method(),headers,...(r.method()==='POST'?{body:r.postData()}:{})});
    const response=await middleware({request,env:s.env,next:async()=>{
     if(url.pathname==='/api/controlled/newsletter-config')return newsletterTestConfiguration(request,s.env,policy);
     if(url.pathname==='/api/controlled/newsletter-observation')return observeNewsletter(request,s.env,{policy,fetcher:async(target,options)=>{
      assert.ok(!options.method||options.method==='GET');assert.ok(target.startsWith('https://api.getresponse.com/v3/'));reads++;
      if(target.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
      if(mode==='contacts_403'||(mode==='error_then_success'&&observations===1))return Response.json({message:'PRIVATE PROVIDER BODY '+s.data.email},{status:403});
      return Response.json([]);
     }});
     const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
     return new Response(readFileSync('public'+name),{headers:{'Content-Type':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'}});
    }});
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   });
   await page.goto(s.env.CONTROLLED_TEST_ORIGIN+'/controlled/newsletter/');await page.waitForFunction(()=>!document.querySelector('[data-observe=before]').disabled);
   if(lang==='en')await page.click('[data-lang=en]');
   assert.equal(await page.locator('[type=submit]').isDisabled(),true);assert.equal(await page.locator('[name=consent]').isChecked(),false);
   await page.fill('[name=email]',s.data.email);await page.click('[data-observe=before]');
   await page.waitForFunction(()=>document.getElementById('observation-result').textContent.includes('"operation": "observation"'));
   const result=await page.locator('#result').textContent(),diagnostic=JSON.parse(await page.locator('#observation-result').textContent());
   assert.match(result,lang==='es'?/observación/:/observation/);assert.ok(!result.includes('No podemos confirmar el envío'));assert.ok(!result.includes('Submission could not be confirmed'));
   if(mode==='contacts_403'||mode==='error_then_success'){assert.equal(diagnostic.stage,'getresponse_contacts');assert.equal(diagnostic.providerStatus,403);assert.equal(diagnostic.code,'contacts_http');}
   if(mode==='storage_read'){assert.equal(diagnostic.stage,'storage_rate_read');assert.equal(reads,0);}
   if(mode==='network')assert.equal(diagnostic.code,'browser_network_or_timeout');
   assert.equal(observations,1);assert.ok(!JSON.stringify(diagnostic).includes(s.data.email));assert.ok(!JSON.stringify(diagnostic).includes('PRIVATE'));
   if(mode==='error_then_success'){await page.click('[data-observe=before]');await page.waitForFunction(()=>document.getElementById('observation-result').textContent.includes('matchingContactFound'));assert.match(await page.locator('#result').textContent(),lang==='es'?/Observación guardada/:/Observation saved/);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_observations').get().n,1);}
   for(const table of ['newsletter_consent_requests','newsletter_html_deliveries'])assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
   assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);count++;
  }finally{await context.close();s.close();}
 }
 console.log('PASS',count,'observation-only browser cases: safe HTTP/D1/network diagnostics, ES/EN desktop/mobile, no consent/subscription/Turnstile calls; stale errors cleared. All providers mocked.');
}finally{await browser.close();}
