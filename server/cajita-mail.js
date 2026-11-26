import {referralTest} from './referral-environment.js';

const ordersMailbox='pedidos@cimstudio.es';
const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);

export async function sendCajitaOrderEmails(env,order,session){
 const customer=session.customer_details?.email?.trim().toLowerCase();
 const preview=order.live===0?referralTest(env):null;
 if(order.live===0&&!preview)return;
 if(!customer||customer.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer)||
  (preview&&(!preview.emails.has(customer)||!preview.emails.has(ordersMailbox))))throw Error('cajita_mail_recipient');
 const delivery=order.shipping?'Envío a domicilio':'Recogida en el taller de Sa Pobla';
 const discount=order.coupon_count*500;
 const summary=`Pedido ${order.id}\nCajita de dos tazitas artesanales\nEntrega: ${delivery}\nProducto: ${money(order.subtotal+discount)}\nDescuento (${order.coupon_count} cupones): ${money(discount)}\nTransporte: ${money(order.shipping)}\nTotal pagado (IVA incluido): ${money(order.subtotal+order.shipping)}`;
 const prefix=preview?'[Sandbox] ':'';
 const notifications=[
  ['studio',ordersMailbox,'Nuevo pedido pagado de CIM Studio',`${summary}\n\nSesión de Stripe: ${session.id}\nConsulta en Stripe el correo del cliente y, para envío, la dirección en el pago asociado.`],
  ['customer',customer,'Confirmación de compra de CIM Studio',`${summary}\n\nPara consultar tu pedido, coordinar la recogida o solicitar una devolución, escribe a ${ordersMailbox} indicando su referencia.\nCondiciones de compra y privacidad: ${order.origin}/cajita/#condiciones`],
 ];
 const db=env.FORMS_DB;
 for(const [kind,to,subject,body] of notifications){
  const sent=await db.prepare('SELECT 1 FROM cajita_order_mail WHERE order_id=? AND kind=?').bind(order.id,kind).first();
  if(sent)continue;
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'cajita-order/'+order.id+'/'+kind},
   body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:prefix+subject,text:body}),
  });
  await response.body?.cancel();
  if(!response.ok)throw Error('cajita_mail_provider');
  await db.prepare('INSERT OR IGNORE INTO cajita_order_mail(order_id,kind,accepted_at) VALUES(?,?,?)').bind(order.id,kind,new Date().toISOString()).run();
 }
}
