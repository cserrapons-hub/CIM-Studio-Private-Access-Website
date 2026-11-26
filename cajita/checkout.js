const form=document.querySelector('#checkout');
const status=document.querySelector('#status');
const button=form.querySelector('button');
const addressFields=document.querySelector('#shipping-address');
const token=new URLSearchParams(location.hash.slice(1)).get('acceso');
if(token){
 sessionStorage.setItem('cajita-access',token);
 history.replaceState(null,'',location.pathname+location.search);
}
const access=sessionStorage.getItem('cajita-access')||undefined;
const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
const endpoint='/api/cajita/checkout';

async function setup(){
 const response=await fetch(endpoint),offer=await response.json();
 if(!response.ok)throw Error();
 document.querySelector('#price').textContent=money(offer.price)+' (IVA incluido)';
 if(!offer.available){status.textContent='La compra aún no está disponible.';return;}
 if(offer.test)status.textContent='Modo de prueba de Stripe.';
 if(access){
  const panel=await fetch('/api/referrals/dashboard',{headers:{'X-Referral-Access':access}});
  if(panel.ok){
   const {availableCoupons}=await panel.json();
   for(let n=1;n<=Math.min(offer.maxCoupons,availableCoupons);n++)form.elements.count.add(new Option(n+' · −'+money(offer.coupon*n),n));
  }
 }
 const data=()=>({count:Number(form.elements.count.value),delivery:form.elements.delivery.value});
 const summary=({count,delivery})=>{
  const discount=offer.coupon*count,shipping=delivery==='shipping'?offer.shipping:0;
  const subtotal=offer.price-discount;
  return {discount,shipping,subtotal,total:subtotal+shipping};
 };
 const refresh=()=>{
  const selection=data(),{discount,shipping,subtotal,total}=summary(selection);
  addressFields.disabled=addressFields.hidden=selection.delivery!=='shipping';
  document.querySelector('#product-price').textContent=money(offer.price);
  document.querySelector('#discount').textContent=(discount?'−':'')+money(discount);
  document.querySelector('#subtotal').textContent=money(subtotal);
  document.querySelector('#shipping-price').textContent=money(shipping);
  document.querySelector('#total').textContent=money(total);
 };
 form.addEventListener('change',refresh);
 const outcome=new URLSearchParams(location.search).get('resultado');
 if(outcome==='recibido'){
  sessionStorage.removeItem('cajita-attempt');
  status.textContent='Consulta el justificante de Stripe para comprobar tu pago.';
  return;
 }
 if(outcome==='cancelado'){
  const previous=JSON.parse(sessionStorage.getItem('cajita-attempt')||'null');
  if(previous){
   const {count,delivery}=JSON.parse(previous.selection);
   if(access&&count>0&&count<=offer.maxCoupons&&!Array.from(form.elements.count.options).some(option=>Number(option.value)===count)){
    form.elements.count.add(new Option(count+' · −'+money(offer.coupon*count)+' (reservados)',count));
   }
   form.elements.count.value=access?String(count):'0';
   form.elements.delivery.value=delivery;
  }
  status.textContent='El pago quedó sin completar. La sesión de Stripe sigue siendo válida hasta que expire.';
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  button.disabled=true;
  const selections=data(),selection=JSON.stringify(selections);
  const previous=JSON.parse(sessionStorage.getItem('cajita-attempt')||'null');
  const id=previous?.selection===selection?previous.id:crypto.randomUUID();
  const fields=form.elements;
  const shipTo=selections.delivery==='shipping'?{
   country:'ES',postal_code:fields.postal.value,name:fields.recipient.value,
   city:fields.city.value,line1:fields.address.value,
  }:undefined;
  sessionStorage.setItem('cajita-attempt',JSON.stringify({selection,id}));
  try{
   const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id,...selections,total:summary(selections).total,shipTo,access})});
   const reply=await result.json();
   if(result.status===409)sessionStorage.removeItem('cajita-attempt');
   if(reply.error==='shipping_zone'){status.textContent='El envío está disponible para códigos postales de Baleares y Península.';return;}
   if(reply.error==='shipping_address'){status.textContent='Revisa el nombre y la dirección de envío.';return;}
   if(reply.error==='price_changed'){status.textContent='El precio ha cambiado. Recarga la página para consultar el total actualizado.';return;}
   if(!result.ok)throw Error();
   location.assign(reply.url);
  }catch{status.textContent='No hemos podido iniciar el pago. Revisa los descuentos disponibles y vuelve a intentarlo.';}
  finally{button.disabled=false;}
 });
 refresh();
 form.hidden=false;
}
setup().catch(()=>{status.textContent='No hemos podido consultar la disponibilidad de la cajita.';});
