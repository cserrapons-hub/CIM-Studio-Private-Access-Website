import {receiptParagraph as p,receiptSpacer as spacer,receiptEmail} from './receipt-email-layout.js';
// Sample acknowledgement only. No network, persistence or external assets.
const website='https://cimstudio.es/';
const clean=value=>typeof value==='string'?value.trim():'';
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function sampleReceipt(data={},language='es'){
 const en=language==='en';
 const address=[clean(data.shippingAddress),[clean(data.postalCode),clean(data.city)].filter(Boolean).join(' '),[clean(data.province),clean(data.country)].filter(Boolean).join(' · ')].filter(Boolean);
 const c=en?{
  subject:'CIM Studio | We have received your sample request',hello:'Hello,',thanks:'Thank you for your interest in CIM Studio.',received:'We have received your sample request.',process:'To process your request, we need you to confirm your shipping details:',address:'Shipping address',confirm:'You can do this by replying to this email with “Details correct”.',mallorca:'If you are in Mallorca',visit:'we can also deliver the samples in person. It would be a lovely opportunity to meet you and introduce you to our work.',prefer:'If you would prefer a visit rather than postal delivery, please let us know by replying to this email.',thankyou:'Thank you very much,',signoff:'Warm regards,'
 }:{
  subject:'CIM Studio | Hemos recibido tu solicitud de muestras',hello:'Hola,',thanks:'Gracias por tu interés en CIM Studio.',received:'Hemos recibido tu solicitud de muestras correctamente.',process:'Para procesar tu solicitud necesitamos que nos confirmes tus datos de envío:',address:'Dirección de envío',confirm:'Puedes hacerlo respondiendo a este email diciendo «Datos correctos».',mallorca:'Si estás en Mallorca',visit:'también podemos entregarte las muestras personalmente. Será una buena ocasión para conocernos y presentarte nuestro trabajo.',prefer:'Si prefieres nuestra visita al envío postal, responde también a este email.',thankyou:'Muchas gracias,',signoff:'Un abrazo,'
 };
 const newsletter=en?{
  title:"Haven’t joined our newsletter yet?",
  first:"During our first year, we won’t have an online shop.",
  story:"We want to introduce each new piece in a more personal way, sharing it first with those who have been with us from the beginning.",
  lead:'Also, ',offer:'if you join before 31 December 2026, you’ll receive a €25 voucher towards your first purchase, with no minimum spend',scope:'. One use per founding member.',
  join:'To join, simply visit ',steps:', select “Access the private collection” and then “Request access”.'
 }:{
  title:'¿Aún no estás en nuestra newsletter?',
  first:'Durante nuestro primer año no vamos a tener tienda online.',
  story:'Queremos presentar cada nueva pieza de una forma más personal, compartiéndola primero con quienes nos acompañáis desde el principio.',
  lead:'Además, ',offer:'si te unes antes del 31 de diciembre de 2026, recibirás un vale de 25 € para descontar de tu primera compra, sin importe mínimo',scope:'. Un solo uso por miembro fundador.',
  join:'Para unirte, solo tienes que entrar en ',steps:', seleccionar «Acceder a la colección privada» y después «Solicitar acceso».'
 };
 const newsletterText=[newsletter.title,newsletter.first,newsletter.story,newsletter.lead+newsletter.offer+newsletter.scope,newsletter.join+'cimstudio.es ('+website+')'+newsletter.steps].join('\n\n');
 const text=[c.hello,c.thanks+'\n'+c.received,c.process,[c.address,...(address.length?['',...address]:[])].join('\n'),c.confirm,'\n\n'+c.mallorca+', '+c.visit,c.prefer,'\n\n\n'+newsletterText,c.thankyou,c.signoff+'\nCIM Studio\nwww.cimstudio.es'].join('\n\n');
 const newsletterHtml=spacer(40)+p('<strong>'+newsletter.title+'</strong>')+p(newsletter.first)+p(newsletter.story)+p(newsletter.lead+'<strong>'+newsletter.offer+'</strong>'+newsletter.scope)+p(newsletter.join+'<strong><a href="'+website+'" style="color:#292923;text-decoration:underline">cimstudio.es</a></strong>'+newsletter.steps);
 const addressHtml=address.length?'<div style="margin:0 0 24px;padding:20px;background:#faf9f6"><p style="margin:0 0 10px;font-weight:600">'+c.address+'</p>'+address.map(escape).join('<br>')+'</div>':'';
 const html=receiptEmail(c.subject,en,p(c.hello)+p(c.thanks+'<br>'+c.received)+p(c.process)+addressHtml+p(c.confirm)+spacer(30)+p('<strong>'+c.mallorca+'</strong>, '+c.visit)+p(c.prefer)+newsletterHtml+p(c.thankyou)+'<p style="margin:0">'+c.signoff+'<br><strong>CIM Studio</strong><br><a href="'+website+'" style="color:#292923;text-decoration:underline">www.cimstudio.es</a></p>');
 return {subject:c.subject,text,html};
}
