// Mixed-version DOM regression only. All API traffic is intercepted; no provider or D1 access.
import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const csp=readFileSync('_headers','utf8').match(/^  Content-Security-Policy: (.+)$/m)?.[1];assert.ok(csp,'Published CSP must be present');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const variant of ['complete','missing-dialog','missing-close'])for(const kind of ['subscribe','samples','careers'])for(const width of [1440,390])for(const lang of ['es','en']){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600}),page=await context.newPage(),errors=[];let configs=0,posts=0,SDK=0;
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
  if(u.hostname==='challenges.cloudflare.com'){SDK++;return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>1,getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});}
  assert.equal(u.origin,'https://local.test');
  if(u.pathname==='/api/config'){configs++;return route.fulfill({json:{enabled:{subscribe:true,samples:true,careers:true},siteKey:'simulation-site',verified:false,siteLive:false,legalVersion:'simulation-policy'}});}
  if(u.pathname.startsWith('/api/')){
   posts++;assert.equal(u.pathname,'/api/'+kind);assert.equal(r.method(),'POST');const data=r.postDataJSON();assert.equal(data.token,'simulation-token');assert.equal(data.consent,true);assert.equal(data.language,lang);
   return route.fulfill({status:202,json:kind==='subscribe'?{ok:true,subscription:'confirmation_required'}:{ok:true,recorded:true,confirmationRequired:kind==='careers',mail:'accepted',mailState:'accepted',receiptMailState:'accepted'}});
  }
  assert.equal(r.method(),'GET');const name=u.pathname==='/'?'index.html':u.pathname.slice(1);let body=readFileSync('public/'+name);
  if(name==='index.html'){
   let html=body.toString();if(variant==='missing-dialog')html=html.replace(/<dialog id="careers-response-dialog"[\s\S]*?<\/dialog>/,'');
   if(variant==='missing-close')html=html.replace(/<button type="button" class="primary" data-careers-response-close>[\s\S]*?<\/button>/,'');body=Buffer.from(html);
  }
  return route.fulfill({body,headers:name==='index.html'?{'Content-Security-Policy':csp}:{},contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream'});
 });
 await page.goto('https://local.test/');await page.waitForFunction(()=>window.cimFormSettings);assert.equal(configs,1);
 await page.locator(`[data-lang=${lang}]`).click();const id=kind==='subscribe'?'subscribe-dialog':kind+'-dialog';await page.locator(`[data-open=${id}]`).click();const form=page.locator(`form[data-form-kind=${kind}]`);
 await form.locator('[name=email]').fill('owner@example.test');
 if(kind==='subscribe')await form.locator('[name=subscriberType]').selectOption('profesional');
 if(kind==='samples')for(const [name,value] of Object.entries({name:'Example Professional',company:'Example Studio',discipline:'architecture',shippingAddress:'Example Street 1',postalCode:'00000',city:'Example City',province:'Example Region',country:'Example Country'})){
  const field=form.locator(`[name=${name}]`);if(name==='discipline')await field.selectOption(value);else await field.fill(value);
 }
 await form.locator('[name='+ (kind==='subscribe'?'marketing_consent':kind==='careers'?'careers_consent':'contact_consent')+']').check();
 await page.waitForFunction(kind=>!document.querySelector(`form[data-form-kind=${kind}] [type=submit]`).disabled,kind);
 await form.locator('[type=submit]').click();
 if(kind==='careers'&&variant!=='complete'){
  await page.waitForFunction(()=>document.querySelector('form[data-form-kind=careers] .status').dataset.message==='receivedCareers');
  assert.equal(await form.locator('.status').getAttribute('data-error'),'false');assert.equal(await page.locator('#careers-dialog').evaluate(e=>e.open),true);
 }else{
  const responseId=kind==='subscribe'?'subscription-pending-dialog':kind==='samples'?'samples-response-dialog':'careers-response-dialog';await page.waitForFunction(id=>document.getElementById(id).open,responseId);
  if(kind!=='subscribe')assert.equal(await form.locator('.status').textContent(),'');
 }
 assert.equal(posts,1);assert.equal(SDK,1);assert.deepEqual(errors,[]);count++;
 }finally{await context.close();}
}console.log(`PASS ${count} ES/EN desktop/mobile cases: all three forms initialise, validate Turnstile and submit once with complete/missing/incomplete careers modal; correct modals or safe inline fallback.`);}finally{await browser.close();}
