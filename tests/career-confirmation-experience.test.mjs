import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {careerReceipt} from '../server/career-receipt.js';
import {sampleReceipt} from '../server/sample-receipt.js';
import {receiptEmail,receiptParagraph} from '../server/receipt-email-layout.js';
import {fixture} from './helpers/launch-fixture.mjs';
import {handleRegistration,withdrawCareerConsent} from '../server/registrations.js';
import legal from '../legal/content.js';
const copy={es:['Hola,','Muchas gracias por tu interés en formar parte de nuestro equipo.','Hemos recibido tu correo electrónico y nos hace mucha ilusión que quieras trabajar con nosotras.','Para que podamos avisarte cuando surjan nuevas oportunidades en CIM Studio, solo tienes que confirmar tu correo electrónico a través del siguiente enlace:','Confirmar mi correo electrónico','Gracias por querer formar parte de nuestro proyecto.','Un abrazo,','Magda y Cati','CIM Studio'],en:['Hello,','Thank you so much for your interest in joining our team.','We have received your email address, and we’re delighted that you would like to work with us.','To hear from us when new opportunities arise at CIM Studio, simply confirm your email address using the following link:','Confirm my email address','Thank you for wanting to be part of our project.','Warm regards,','Magda and Cati','CIM Studio']};
test('career receipt has the approved bilingual paragraphs, token link and shared simple sample email shell',()=>{
 for(const lang of ['es','en']){
  const url='https://cimstudio.es/careers/preferences/'+(lang==='en'?'?lang=en':'')+'#'+'a'.repeat(64),r=careerReceipt(url,lang);
  assert.equal(r.subject,lang==='es'?'CIM Studio — Confirma para recibir avisos':'CIM Studio — Confirm to receive updates');
  for(const body of [r.text,r.html.replace(/<[^>]*>/g,'')]){let at=-1;for(const paragraph of copy[lang]){at=body.indexOf(paragraph,at+1);assert.ok(at>=0,paragraph);}}
  assert.equal((r.html.match(/<a /g)||[]).length,1);assert.ok(r.html.includes('href="'+url+'"'));assert.ok(r.text.includes(url));
  const shell=receiptEmail(r.subject,lang==='en','MARKER');assert.equal(r.html.slice(0,r.html.indexOf(receiptParagraph(copy[lang][0]))),shell.split('MARKER')[0]);
  assert.ok(r.html.endsWith(shell.split('MARKER')[1]));assert.doesNotMatch(r.html,/<img|<script|<form|@import/i);
  assert.match(r.html,/background:transparent/);assert.match(r.html,/font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5/);
 }
 assert.ok(careerReceipt('https://cimstudio.es/" onmouseover="unsafe').html.includes('&quot;'));assert.ok(!careerReceipt('https://cimstudio.es/" onmouseover="unsafe').html.includes('href="https://cimstudio.es/" onmouseover='));
});
async function career(lang='es'){
 const s=await fixture();Object.assign(s.env,{CONTROLLED_TEST_MODE:'false',REGISTRATION_ORIGIN:'https://cimstudio.es'});const mails=[];
 const fetcher=async(url,options)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'cimstudio.es',action:'careers'});assert.equal(url,'https://api.resend.com/emails');mails.push(JSON.parse(options.body));return Response.json({id:'simulation-mail-'+mails.length});};
 const req=(path,data)=>new Request('https://cimstudio.es'+path,{method:'POST',headers:{Origin:'https://cimstudio.es','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(data)});
 await handleRegistration(req('/api/careers',{...s.data,language:lang,legalVersion:legal.version}),s.env,'careers',fetcher);
 const link=mails[0].text.match(/https:\/\/[^\s]+/)[0],token=new URL(link).hash.slice(1);
 return {...s,mails,fetcher,link,token,action:(token,action='confirm')=>withdrawCareerConsent(req('/api/careers/unsubscribe',{token,action}),s.env,new Date(),null,fetcher)};
}
test('valid personal career links confirm persistently, send one admin notice and preserve independent consents',async()=>{
 for(const lang of ['es','en']){const s=await career(lang);try{
  assert.equal(new URL(s.link).pathname,'/careers/preferences/');assert.equal(new URL(s.link).searchParams.get('lang'),lang==='en'?'en':null);assert.match(s.token,/^[a-f0-9]{64}$/);
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');assert.ok(s.mails[0].html);assert.equal(s.mails[0].from,s.env.MAIL_FROM);
  assert.deepEqual(await(await s.action(s.token)).json(),{ok:true,confirmation:'confirmed'});
  assert.deepEqual(await(await s.action(s.token)).json(),{ok:true,confirmation:'already_confirmed'});assert.equal(s.mails.length,2);
  assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'active');assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
  await s.action(s.token,'unsubscribe');assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'withdrawn');
  assert.deepEqual(await(await s.action(s.token)).json(),{ok:true,confirmation:'not_confirmed'});assert.equal(s.mails.length,2);
 }finally{s.close();}}
});
test('unknown tokens, malformed tokens and persistence errors never report a confirmed career subscription',async()=>{
 const s=await career();try{
  assert.deepEqual(await(await s.action('b'.repeat(64))).json(),{ok:true,confirmation:'not_confirmed'});assert.equal((await s.action('bad')).status,400);assert.equal(s.mails.length,1);
  s.careers.sqlite.exec("CREATE TRIGGER fail_confirm BEFORE UPDATE ON registrations BEGIN SELECT RAISE(ABORT,'simulated error'); END");
  const response=await s.action(s.token);assert.equal(response.status,503);assert.equal(s.careers.sqlite.prepare('SELECT state FROM registrations').get().state,'pending');assert.equal(s.mails.length,1);
 }finally{s.close();}
});
test('confirmation assets are versioned while shared newsletter welcome and sample copy remain separate',()=>{
 const html=readFileSync('public/careers/preferences/index.html','utf8');
 for(const [url,file] of [['/assets/subscription-welcome.css','subscription-welcome/welcome.css'],['/careers/preferences/preferences.css','careers/preferences/preferences.css'],['/careers/preferences/preferences.js','careers/preferences/preferences.js']])assert.ok(html.includes(url+'?v='+createHash('sha256').update(readFileSync(file)).digest('hex').slice(0,12)));
 assert.match(html,/no-referrer/);assert.match(html,/data-panel="confirmed" hidden/);assert.match(html,/href="https:\/\/cimstudio.es\/"/);
 assert.ok(!readFileSync('careers/preferences/preferences.js','utf8').includes('/api/subscribe'));
 assert.equal(sampleReceipt({},'es').subject,'CIM Studio | Hemos recibido tu solicitud de muestras');
});
