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
  assert.equal((result.html.match(/<a /g)||[]).length,2);assert.doesNotMatch(result.html,/<script|<img|<iframe|<form|<link|@import|onload=/i);assert.doesNotMatch(result.text,/<html|\[Dirección\]|\[Código postal\]/);
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

test('sample email uses a single cream background and removes only the word just/solo in both alternatives',()=>{
 for(const lang of ['es','en']){
  const result=sampleReceipt(address,lang),sentence=lang==='es'?'Para procesar tu solicitud necesitamos que nos confirmes tus datos de envío:':'To process your request, we need you to confirm your shipping details:';
  assert.ok(result.text.includes(sentence));assert.ok(result.html.includes(sentence));assert.doesNotMatch(result.html+result.text,/sol[o] necesitamos|we just need/);
  const backgrounds=[...result.html.matchAll(/background:([^;"}]+)/g)].map(m=>m[1]);assert.ok(backgrounds.length>=5);assert.deepEqual([...new Set(backgrounds)],['#faf9f6']);
  assert.doesNotMatch(result.html,/background:#ffffff|background:#f7f6f2|border:|box-shadow:/);
  assert.ok(result.html.includes('margin:0 0 24px;padding:20px;'));assert.ok(result.html.includes('padding:32px 24px;'));assert.ok(result.html.includes('padding:24px 16px'));
 }
});


test('sample newsletter invitation preserves approved copy and ES/EN HTML/plain-text order before the sign-off',()=>{
 const copy={
  es:[
   '¿Aún no estás en nuestra newsletter?',
   'Durante nuestro primer año no vamos a tener tienda online.',
   'Queremos presentar cada nueva pieza de una forma más personal, compartiéndola primero con quienes nos acompañáis desde el principio.',
   'Además, si te unes antes del 31 de diciembre de 2026, disfrutarás de nuestra Tarifa Fundadores: un 15 % de descuento de por vida, aplicable también sobre el precio profesional, tanto en piezas de nuestra colección como en piezas hechas a medida.',
   'Para unirte, solo tienes que entrar en cimstudio.es, seleccionar «Acceder a la colección privada» y después «Solicitar acceso».'
  ],
  en:[
   'Haven’t joined our newsletter yet?',
   'During our first year, we won’t have an online shop.',
   'We want to introduce each new piece in a more personal way, sharing it first with those who have been with us from the beginning.',
   'Also, if you join before December 31, 2026, you’ll enjoy our Founders Rate: a lifetime 15% discount, also applicable to professional pricing, on both pieces from our collection and bespoke pieces.',
   'To join, simply visit cimstudio.es, select “Access the private collection” and then “Request access”.'
  ]
 };
 for(const lang of ['es','en']){
  const r=sampleReceipt(address,lang),plain=r.text.replace('cimstudio.es (https://cimstudio.es/)','cimstudio.es'),html=r.html.replace(/<[^>]+>/g,'');
  for(const content of [plain,html]){
   let previous=content.indexOf(lang==='es'?'Si prefieres nuestra visita':'If you would prefer a visit');assert.ok(previous>=0);
   for(const paragraph of copy[lang]){const position=content.indexOf(paragraph);assert.ok(position>previous);previous=position;}
   assert.ok(content.indexOf(lang==='es'?'Muchas gracias,':'Thank you very much,')>previous);
  }
  assert.match(r.html,/<strong>[^<]*lifetime 15% discount<\/strong>|<strong>[^<]*15 % de descuento de por vida<\/strong>/);
  assert.ok(r.text.includes('https://cimstudio.es/'));
 }
});
test('sample invitation has only homepage links and never includes automatic or direct-subscription URLs',()=>{
 for(const lang of ['es','en']){
  const r=sampleReceipt(address,lang),links=[...r.html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
  assert.deepEqual(links.map(m=>m[1]),['https://cimstudio.es/','https://cimstudio.es/']);
  assert.deepEqual(links.map(m=>m[2]),['cimstudio.es','www.cimstudio.es']);
  assert.doesNotMatch(r.html+r.text,/api\/subscribe|add_subscriber|unsubscribe|requestId=|token=|<form|<img|<script/i);
 }
});


test('sample section spacing adds only 30px before Mallorca and 40px before the newsletter, equally in ES/EN',()=>{
 for(const lang of ['es','en']){
  const r=sampleReceipt(address,lang),mallorca=lang==='es'?'Si estás en Mallorca':'If you are in Mallorca',newsletter=lang==='es'?'¿Aún no estás en nuestra newsletter?':'Haven’t joined our newsletter yet?';
  assert.ok(r.html.includes('height="30" style="height:30px;line-height:30px;font-size:1px">&nbsp;</td></tr></table><p style="margin:0 0 22px"><strong>'+mallorca+'</strong>'));
  assert.ok(r.html.includes('height="40" style="height:40px;line-height:40px;font-size:1px">&nbsp;</td></tr></table><p style="margin:0 0 22px"><strong>'+newsletter+'</strong>'));
  assert.deepEqual([...r.html.matchAll(/<td height="(\d+)" style="height:\d+px;line-height:\d+px;font-size:1px">/g)].map(m=>Number(m[1])),[30,40]);
  assert.ok(r.text.includes('\n\n\n\n'+mallorca));assert.ok(r.text.includes('\n\n\n\n\n'+newsletter));
  assert.ok(!r.text.includes('\n\n\n\n\n'+mallorca));assert.ok(!r.text.includes('\n\n\n\n\n\n'+newsletter));
 }
});
