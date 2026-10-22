// Local simulation only. Build first; requires Playwright, Chromium and Node with node:sqlite. No real provider requests.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const {legal,publicSettings}=await import(root+'/server/settings.js');const {handleRegistration,withdrawCareerConsent}=await import(root+'/server/registrations.js');const original=structuredClone(legal);
function store(){const s=new DatabaseSync(':memory:');s.exec(readFileSync(root+'/migrations/0005_registrations.sql','utf8'));s.exec(readFileSync(root+'/migrations/0008_launch_operations.sql','utf8'));const db={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return s.prepare(sql).get(...args)||null;},async all(){return {results:s.prepare(sql).all(...args)};},async run(){return {meta:{changes:s.prepare(sql).run(...args).changes}};},sql,args:()=>args};},async batch(items){s.exec('BEGIN');try{const out=items.map(x=>({results:s.prepare(x.sql).all(...x.args())}));s.exec('COMMIT');return out;}catch(e){s.exec('ROLLBACK');throw e;}}};return {s,db};}
const samples=store(),careers=store(),env={FORMS_ENABLED:'true',SAMPLES_ENABLED:'true',CAREERS_ENABLED:'true',SAMPLES_VERIFIED:'true',CAREERS_VERIFIED:'true',MAIL_RECEIPTS_VERIFIED:'true',REGISTRATIONS_STORAGE_REVIEWED:'true',REGISTRATION_ORIGIN:'https://cim.test',REGISTRATION_REVIEW_DAYS:'90',SAMPLES_DATA_KEY:btoa('s'.repeat(32)),CAREERS_DATA_KEY:btoa('c'.repeat(32)),TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret',AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-chars',RESEND_API_KEY:'simulation-not-real',MAIL_FROM:'CIM Test <test@example.test>',FORMS_DB:samples.db,CAREERS_DB:careers.db};
Object.assign(legal,{approved:true,version:'browser-simulation-only'});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox']});let total=0;
try{
 for(const width of [1920,1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500}),errors=[],sent=[],posts=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await context.route('**/*',async route=>{
   const r=route.request(),url=new URL(r.url());
   if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render:()=>Math.random(),getResponse:()=> 'simulation-token',remove:()=>{},reset:()=>{}};window.cimTurnstileReady();"});
   assert.equal(url.origin,'https://cim.test');
   if(url.pathname==='/api/config')return route.fulfill({contentType:'application/json',body:JSON.stringify(publicSettings(env,url))});
   if(url.pathname.startsWith('/api/')){
    posts.push(url.pathname);const kind=url.pathname.includes('/careers')?'careers':'samples';
    const request=new Request(r.url(),{method:r.method(),headers:{Origin:url.origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+([1920,1440,768,390,320].indexOf(width)+1)},body:r.postData()});
    const fetcher=async(target,options)=>{if(target.includes('siteverify'))return Response.json({success:true,hostname:'cim.test',action:kind});assert.equal(target,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return Response.json({id:'simulated-'+sent.length});};
    const response=url.pathname.endsWith('/unsubscribe')?await withdrawCareerConsent(request,env,new Date(),null,fetcher):await handleRegistration(request,env,kind,fetcher);
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   }
   const relative=url.pathname==='/'?'index.html':url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
   const file=root+'/public/'+relative.replace(/^\//,'');assert.ok(existsSync(file),file);
   return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body:readFileSync(file)});
  });
  const page=await context.newPage();await page.goto('https://cim.test/');await page.waitForFunction(()=>window.cimFormSettings);
  for(const lang of ['es','en']){
   await page.locator('[data-lang='+lang+']').click();
   await page.locator('[data-open=subscribe-dialog]').click();await page.locator('#email').fill('newsletter-'+width+'-'+lang+'@example.test');await page.locator('[name=marketing_consent]').check();const before=posts.length;await page.locator('#subscribe-dialog [type=submit]').click();assert.equal(posts.length,before);assert.equal(await page.locator('#subscription-pending-dialog').evaluate(e=>e.open),false);await page.keyboard.press('Escape');
   await page.locator('[data-open=samples-dialog]').click();const sample=page.locator('[data-form-kind=samples]');
   for(const [name,value] of Object.entries({name:'Professional',email:'sample-'+width+'-'+lang+'@example.test',company:'Studio',shippingAddress:'Test street 1',postalCode:'00000',city:'Test city',province:'Test region',country:'Test country'}))await sample.locator('[name='+name+']').fill(value);
   await sample.locator('[name=discipline]').selectOption('architecture');await sample.locator('[name=contact_consent]').check();await sample.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-form-kind=samples] .status').textContent.includes(document.documentElement.lang==='es'?'registrado':'recorded'));assert.equal(sent.filter(m=>m.to[0]==='admin@cimstudio.es'&&m.reply_to).length,lang==='es'?1:2);await page.keyboard.press('Escape');
   await page.locator('[data-open=careers-dialog]').click();const career=page.locator('[data-form-kind=careers]');await career.locator('[type=email]').fill('career-'+width+'-'+lang+'@example.test');assert.equal(await career.locator('[name=careers_consent]').isChecked(),false);await career.locator('[name=careers_consent]').check();await career.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-form-kind=careers] .status').textContent.includes(document.documentElement.lang==='es'?'registrado':'recorded'));await page.keyboard.press('Escape');
   const receipt=sent.find(m=>m.to[0]==='career-'+width+'-'+lang+'@example.test'),token=receipt.text.match(/preferences\/#([a-f0-9]{64})/)[1];
   const preferences=await context.newPage(),count=posts.length;await preferences.goto('https://cim.test/careers/preferences/#'+token);await preferences.waitForFunction(()=>location.hash==='');assert.equal(posts.length,count);
   await preferences.locator('[data-lang='+lang+']').click();await preferences.locator('[data-action=confirm]').click();await preferences.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes(document.documentElement.lang==='es'?'confirmación':'Confirmation'));
   assert.equal(sent.filter(m=>m.to[0]==='admin@cimstudio.es'&&!m.reply_to).length,lang==='es'?1:2);
   await preferences.locator('[data-action=unsubscribe]').click();await preferences.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes(document.documentElement.lang==='es'?'baja':'Withdrawal'));assert.ok(await preferences.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await preferences.close();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));total++;
  }
  assert.deepEqual(errors,[]);assert.equal(careers.s.prepare("SELECT COUNT(*) n FROM registrations WHERE state!='withdrawn'").get().n,0);await context.close();
 }
 console.log('PASS '+total+' browser cases ES/EN 1920/1440/768/390/320px: newsletter safely blocked, actual local samples/career handlers + SQLite, admin/receipt mails mocked, explicit career confirmation/withdrawal, no auto-confirm on GET, no horizontal overflow or JS errors. No external requests.');
}finally{Object.assign(legal,original);samples.s.close();careers.s.close();await browser.close();}
