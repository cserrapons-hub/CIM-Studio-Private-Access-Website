// Simple email layout regression; every network request is blocked, no real sends.
import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {sampleReceipt} from '../server/sample-receipt.js';import {careerReceipt} from '../server/career-receipt.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CIM_EMAIL_SCREENSHOTS||'/tmp/cim-simple-emails';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});let count=0;
try{for(const language of ['es','en'])for(const width of [390,800])for(const kind of ['samples','careers']){
 const tokenUrl='https://cimstudio.es/careers/preferences/'+(language==='en'?'?lang=en':'')+'#'+'a'.repeat(64);
 const receipt=kind==='samples'?sampleReceipt({shippingAddress:'Example Street 12',postalCode:'07000',city:'Example City',province:'Illes Balears',country:'Spain'},language):careerReceipt(tokenUrl,language);
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',()=>{throw Error('No external requests permitted');});
 await page.setContent(receipt.html);
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,body:getComputedStyle(document.body).backgroundColor,td:[...document.querySelectorAll('td')].map(e=>{const s=getComputedStyle(e);return {padding:s.padding,font:s.fontFamily,size:s.fontSize,align:s.textAlign,x:e.getBoundingClientRect().left};}),paragraphs:[...document.querySelectorAll('p')].map(e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,align:s.textAlign,margin:s.marginBottom};}),links:[...document.querySelectorAll('a')].map(e=>e.getAttribute('href')),decorations:document.querySelectorAll('img,button,header,hr,table[aria-hidden]').length}));
 assert.equal(metrics.overflow,false);assert.equal(metrics.body,'rgba(0, 0, 0, 0)');assert.equal(metrics.decorations,0);assert.equal(metrics.td.length,1);assert.equal(metrics.td[0].padding,'10px');assert.equal(metrics.td[0].size,'14px');assert.match(metrics.td[0].font,/^Arial/);assert.equal(metrics.td[0].align,'left');assert.equal(metrics.td[0].x,0);
 for(const p of metrics.paragraphs){assert.match(p.font,/^Arial/);assert.equal(p.size,'14px');assert.equal(p.align,'left');assert.ok(['14px','0px'].includes(p.margin));}
 assert.deepEqual(metrics.links,kind==='samples'?['https://cimstudio.es/','https://cimstudio.es/']:[tokenUrl]);assert.ok(receipt.text.length>100);assert.doesNotMatch(receipt.text,/\n{3,}/);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/${kind}-${language}-${width}.png`,fullPage:true});writeFileSync(`${out}/${kind}-${language}-${width}.html`,receipt.html);await page.close();count++;
}console.log(`PASS ${count} simple sample/career email layouts: ES/EN, 390/800px, Arial 14px, transparent, 10px padding, natural paragraphs and exact links. No real sends; not native Gmail/Outlook testing.`);}finally{await browser.close();}
