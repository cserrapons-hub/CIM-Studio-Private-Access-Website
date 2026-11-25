const form=document.querySelector('#checkout');
const status=document.querySelector('#status');
const button=form.querySelector('button');
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
 if(offer.shipping!==null)form.elements.delivery.add(new Option('Envío a España · '+money(offer.shipping),'shipping'));
 if(access){
  const panel=await fetch('/api/referrals/dashboard',{headers:{Authorization:'Bearer '+access}});
  if(panel.ok){
   const {availableCoupons}=await panel.json();
   for(let n=1;n<=Math.min(3,availableCoupons);n++)form.elements.count.add(new Option(n+' · −'+money(500*n),n));
  }
 }
 const data=()=>({count:Number(form.elements.count.value),delivery:form.elements.delivery.value});
 const refresh=()=>{
  const {count,delivery}=data();
  document.querySelector('#total').textContent='Total '+money(offer.price-500*count+(delivery==='shipping'?offer.shipping:0));
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
  if(previous&&access){
   const {count,delivery}=JSON.parse(previous.selection);
   if(count>0&&count<=3&&!Array.from(form.elements.count.options).some(option=>Number(option.value)===count)){
    form.elements.count.add(new Option(count+' · −'+money(500*count)+' (reservados)',count));
   }
   form.elements.count.value=String(count);
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
  sessionStorage.setItem('cajita-attempt',JSON.stringify({selection,id}));
  try{
   const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...selections,access})});
   if(result.status===409)sessionStorage.removeItem('cajita-attempt');
   if(!result.ok)throw Error();
   location.assign((await result.json()).url);
  }catch{status.textContent='No hemos podido iniciar el pago. Revisa los descuentos disponibles y vuelve a intentarlo.';}
  finally{button.disabled=false;}
 });
 refresh();
 form.hidden=false;
}
setup().catch(()=>{status.textContent='No hemos podido consultar la disponibilidad de la cajita.';});
