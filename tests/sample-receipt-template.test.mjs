import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleReceipt} from '../server/sample-receipt.js';
import {fixture} from './helpers/launch-fixture.mjs';
import {handleRegistration} from '../server/registrations.js';
import legal from '../legal/content.js';
const address={shippingAddress:'Calle de ejemplo 12',postalCode:'07000',city:'Ciudad de ejemplo',province:'Illes Balears',country:'España'};
test('sample acknowledgement has faithful ES/EN subjects, address and plain-text alternative',()=>{
 for(const lang of ['es','en']){
  const result=sampleReceipt(address,lang);assert.equal(result.subject,lang==='es'?'CIM Studio | Hemos recibido tu solicitud de muestras':'CIM Studio | We have received your sample request');
  for(const value of Object.values(address)){assert.ok(result.text.includes(value));assert.ok(result.html.includes(value));}
  assert.ok(result.text.includes('07000 Ciudad de ejemplo\nIlles Balears · España'));
  assert.ok(result.text.includes(lang==='es'?'«Datos correctos»':'“Details correct”'));assert.ok(result.text.includes('Mallorca'));
  assert.match(result.html,/<strong>Si estás en Mallorca<\/strong>|<strong>If you are in Mallorca<\/strong>/);
  assert.ok(result.html.includes('lang="'+lang+'"'));assert.match(result.html,/width:100%;max-width:600px/);assert.match(result.html,/href="https:\/\/cimstudio.es\/"/);
  assert.equal((result.html.match(/<a /g)||[]).length,1);assert.doesNotMatch(result.html,/<script|<img|<iframe|<form|<link|@import|onload=/i);assert.doesNotMatch(result.text,/<html|\[Dirección\]|\[Código postal\]/);
 }
});
test('all five user address fields are escaped in HTML; missing fields never become invented values or placeholders',()=>{
 const hostile=Object.fromEntries(Object.keys(address).map(k=>[k,'<script>"&\' '+k+'</script>']));
 const result=sampleReceipt(hostile);assert.ok(!result.html.includes('<script>'));assert.match(result.html,/&lt;script&gt;&quot;&amp;&#39;/);assert.ok(result.text.includes('<script>'));
 for(const input of [{},{postalCode:undefined,city:null,province:15,country:''},{shippingAddress:'Only supplied address'}]){
  const r=sampleReceipt(input);assert.doesNotMatch(r.html+r.text,/undefined|null|\[Dirección\]|\[País\]|07000|Ciudad de ejemplo/);if(input.shippingAddress)assert.ok(r.text.includes(input.shippingAddress));
 }
});
test('actual sample payload keeps MAIL_FROM and administrative Reply-To, adds applicant HTML/text and admin Reply-To only to the acknowledgement',async()=>{
 for(const lang of ['es','en']){
  const s=await fixture();s.env.CONTROLLED_TEST_MODE='false';const mails=[];
  try{
   const request=s.request('/api/samples',{...s.sample,...address,language:lang,legalVersion:legal.version});
   const response=await handleRegistration(request,s.env,'samples',async(url,options)=>{
    if(url.includes('siteverify'))return Response.json({success:true,hostname:new URL(s.env.REGISTRATION_ORIGIN).hostname,action:'samples'});
    assert.equal(url,'https://api.resend.com/emails');mails.push(JSON.parse(options.body));return Response.json({id:'simulation-'+mails.length});
   });
   assert.equal(response.status,202);assert.equal(mails.length,2);const [admin,receipt]=mails;
   assert.equal(admin.from,s.env.MAIL_FROM);assert.equal(admin.reply_to,s.sample.email);assert.equal(Object.hasOwn(admin,'html'),false);
   assert.equal(receipt.from,s.env.MAIL_FROM);assert.equal(receipt.reply_to,'admin@cimstudio.es');assert.deepEqual(receipt.to,[s.sample.email]);
   assert.equal(receipt.subject,sampleReceipt(address,lang).subject);assert.equal(receipt.html,sampleReceipt(address,lang).html);assert.equal(receipt.text,sampleReceipt(address,lang).text);
   assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);
  }finally{s.close();}
 }
});
test('career acknowledgement is not given sample text, HTML or Reply-To',async()=>{
 const s=await fixture();s.env.CONTROLLED_TEST_MODE='false';const mails=[];try{
  const response=await handleRegistration(s.request('/api/careers',{...s.data,legalVersion:legal.version}),s.env,'careers',async(url,options)=>{
   if(url.includes('siteverify'))return Response.json({success:true,hostname:new URL(s.env.REGISTRATION_ORIGIN).hostname,action:'careers'});mails.push(JSON.parse(options.body));return Response.json({id:'simulation-career'});
  });assert.equal(response.status,202);assert.equal(mails.length,1);assert.equal(Object.hasOwn(mails[0],'reply_to'),false);assert.equal(Object.hasOwn(mails[0],'html'),false);assert.ok(!mails[0].text.includes('Datos correctos'));
 }finally{s.close();}
});
