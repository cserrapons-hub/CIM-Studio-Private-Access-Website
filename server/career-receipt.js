// Career-update confirmation only; it never creates a commercial subscription.
import {receiptParagraph as p,receiptEmail} from './receipt-email-layout.js';
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function careerReceipt(preferences,language='es'){
 const en=language==='en',c=en?{
  subject:'CIM Studio — Confirm to receive updates',hello:'Hello,',
  thanks:'Thank you so much for your interest in joining our team.',
  received:'We have received your email address, and we’re delighted that you would like to work with us.',
  confirm:'To hear from us when new opportunities arise at CIM Studio, simply confirm your email address using the following link:',
  link:'Confirm my email address',closing:'Thank you for wanting to be part of our project.',signoff:'Warm regards,',names:'Magda and Cati'
 }:{
  subject:'CIM Studio — Confirma para recibir avisos',hello:'Hola,',
  thanks:'Muchas gracias por tu interés en formar parte de nuestro equipo.',
  received:'Hemos recibido tu correo electrónico y nos hace mucha ilusión que quieras trabajar con nosotras.',
  confirm:'Para que podamos avisarte cuando surjan nuevas oportunidades en CIM Studio, solo tienes que confirmar tu correo electrónico a través del siguiente enlace:',
  link:'Confirmar mi correo electrónico',closing:'Gracias por querer formar parte de nuestro proyecto.',signoff:'Un abrazo,',names:'Magda y Cati'
 };
 const text=[c.hello,c.thanks,c.received,c.confirm,c.link+': '+preferences,c.closing,c.signoff,c.names+'\nCIM Studio'].join('\n\n');
 const html=receiptEmail(c.subject,en,p(c.hello)+p(c.thanks)+p(c.received)+p(c.confirm)+p('<a href="'+escape(preferences)+'" style="color:#292923;text-decoration:underline"><strong>'+c.link+'</strong></a>')+p(c.closing)+p(c.signoff)+'<p style="margin:0">'+c.names+'<br><strong>CIM Studio</strong></p>');
 return {subject:c.subject,text,html};
}
