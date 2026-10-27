// Render generated email locally; no Resend, mailboxes or external services are contacted.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {sampleReceipt} from '../server/sample-receipt.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CIM_EMAIL_SCREENSHOTS||'/tmp/cim-sample-email-spacers';mkdirSync(out,{recursive:true});
const spacerPattern=/<table role="presentation" aria-hidden="true"[^>]*><tr><td[^>]*>&nbsp;<\/td><\/tr><\/table>/g;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const language of ['es','en'])for(const width of [390,800])for(const profile of ['normal','spacer-styles-stripped']){
 const receipt=sampleReceipt({shippingAddress:'Example Street 12',postalCode:'07000',city:'Example City',province:'Illes Balears',country:'Spain'},language);
 const spacers=[...receipt.html.matchAll(spacerPattern)];assert.equal(spacers.length,2);
 const baseline=receipt.html.replace(spacerPattern,'');
 const html=profile==='normal'?receipt.html:receipt.html.replace(spacerPattern,table=>table.replace(/ style="[^"]*"/g,''));
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',()=>{throw Error('No external requests permitted');});let previous;
 for(const [version,content] of [['without-spacers',baseline],['with-spacers',html]]){
  await page.setContent(content);
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,paragraphs:[...document.querySelectorAll('p')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent,y:r.y,x:r.x,width:r.width,height:r.height,margin:s.margin,font:s.fontFamily,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,color:s.color};}),links:[...document.querySelectorAll('a')].map(e=>[e.getAttribute('href'),e.textContent]),spacers:[...document.querySelectorAll('table[aria-hidden="true"] td')].map(e=>e.getBoundingClientRect().height)}));
  assert.equal(metrics.overflow,false);
  if(version==='without-spacers')previous=metrics;
  else{
   assert.deepEqual(metrics.spacers,[30,40]);assert.deepEqual(metrics.links,previous.links);
   assert.equal(metrics.paragraphs.length,previous.paragraphs.length);
   const mallorca=language==='es'?'Si estás en Mallorca':'If you are in Mallorca',newsletter=language==='es'?'¿Aún no estás en nuestra newsletter?':'Haven’t joined our newsletter yet?';let shift=0;
   for(let i=0;i<metrics.paragraphs.length;i++){
    const actual=metrics.paragraphs[i],before=previous.paragraphs[i];
    if(actual.text.startsWith(mallorca))shift+=30;if(actual.text===newsletter)shift+=40;
    assert.ok(Math.abs(actual.y-before.y-shift)<.01,'Only the two requested gaps move subsequent paragraphs');
    const {y,...rest}=actual,{y:oldY,...oldRest}=before;assert.deepEqual(rest,oldRest,'All paragraph content, styles and dimensions stay unchanged');
   }
   assert.equal(shift,70);assert.deepEqual(errors,[]);
  }
  if(profile==='normal')await page.screenshot({path:`${out}/${language}-${width}-${version}.png`,fullPage:true});
 }
 writeFileSync(`${out}/${language}-${width}-${profile}.html`,html);
 await page.close();count++;
}console.log(`PASS ${count} local ES/EN email cases: exact 30/40px table gaps, 390/800px, preserved paragraphs and links, HTML-height fallback, no external requests. Not a native Gmail/Outlook rendering test.`);}finally{await browser.close();}
