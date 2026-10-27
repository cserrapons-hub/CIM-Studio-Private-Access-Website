(()=>{
 const text={es:{pageTitle:'CIM Studio — Avisos profesionales',navigation:'Idioma',checkingTitle:'Estamos confirmando tu correo electrónico.',checking:'Espera un momento, por favor.',title:'¡Gracias por querer formar parte de nuestro equipo!',confirmed:'Tu correo electrónico se ha confirmado correctamente.',updates:'A partir de ahora, te avisaremos cuando surjan nuevas oportunidades para trabajar con nosotras.',explore:'Mientras tanto, descubre nuestro universo.',invitation:'Si te apetece conocer un poquito más nuestro proyecto y descubrir las nuevas piezas y colecciones que vamos creando, te invitamos a suscribirte a nuestra newsletter.',join:'Para unirte, solo tienes que entrar en ',steps:', seleccionar «Acceder a la colección privada» y después «Solicitar acceso».',discover:'Descubrir CIM Studio',thanks:'Gracias por acompañarnos.',names:'Magda y Cati',problemTitle:'No hemos podido confirmar tu correo.',contact:'Si necesitas ayuda, escribe a ',retry:'Volver a comprobar',unsubscribe:'No quiero recibir estos avisos',missing:'El enlace no está completo o no es válido.',invalid:'El enlace ya no permite confirmar estos avisos. No se ha activado ninguna suscripción nueva.',error:'No podemos confirmar el resultado de la operación. Puedes volver a comprobarlo; no necesitas enviar otra solicitud desde el formulario.',withdrawn:'Hemos procesado la solicitud de retirada de avisos profesionales.'},en:{pageTitle:'CIM Studio — Career updates',navigation:'Language',checkingTitle:'We’re confirming your email address.',checking:'Please wait a moment.',title:'Thank you for wanting to join our team!',confirmed:'Your email address has been successfully confirmed.',updates:'From now on, we’ll let you know when new opportunities to work with us arise.',explore:'In the meantime, discover our universe.',invitation:'If you’d like to learn a little more about our project and discover the new pieces and collections we’re creating, we invite you to join our newsletter.',join:'To join, simply visit ',steps:', select “Access the private collection” and then “Request access”.',discover:'Discover CIM Studio',thanks:'Thank you for being with us.',names:'Magda and Cati',problemTitle:'We could not confirm your email.',contact:'If you need help, email ',retry:'Check again',unsubscribe:'Stop these updates',missing:'This link is incomplete or invalid.',invalid:'This link can no longer confirm these updates. No new subscription has been activated.',error:'We cannot confirm the outcome of this operation. You can check again; there is no need to resubmit the form.',withdrawn:'We have processed the request to stop career updates.'}};
 let lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'es',state='checking',busy=false,lastAction='confirm';
 const token=location.hash.slice(1),valid=/^[a-f0-9]{64}$/.test(token);
 // Keep the bearer token only in memory: never in query strings, storage, logs or outgoing links.
 history.replaceState(null,'',location.pathname+location.search);
 const retry=document.querySelector('[data-action=retry]'),withdraw=document.querySelector('[data-action=unsubscribe]');
 function render(){
  document.documentElement.lang=lang;document.title=text[lang].pageTitle;
  document.querySelector('nav').setAttribute('aria-label',text[lang].navigation);
  document.querySelectorAll('[data-lang]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.lang===lang)));
  document.querySelectorAll('[data-copy]').forEach(e=>e.textContent=text[lang][e.dataset.copy]);
  for(const panel of document.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==(state==='confirmed'?'confirmed':state==='checking'?'checking':'problem');
  document.querySelector('[data-message]').textContent=text[lang][state]||'';
  if(state==='withdrawn')document.querySelector('[data-panel=problem] h1').textContent=lang==='es'?'Tus avisos profesionales.':'Your career updates.';
  retry.hidden=state!=='error';withdraw.hidden=!valid||state==='withdrawn';retry.disabled=withdraw.disabled=busy;
  document.querySelector('main').setAttribute('aria-busy',String(busy));
 }
 async function submit(action){
  if(busy||!valid)return;
  busy=true;lastAction=action;if(action==='confirm')state='checking';render();
  try{
   const response=await fetch('/api/careers/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action}),signal:AbortSignal.timeout(15000),credentials:'same-origin',referrerPolicy:'no-referrer'});
   const result=await response.json();if(!response.ok||result.ok!==true)throw Error('operation_failed');
   if(action==='confirm')state=['confirmed','already_confirmed'].includes(result.confirmation)?'confirmed':result.confirmation==='not_confirmed'?'invalid':'error';
   else state='withdrawn';
  }catch{state='error';}finally{busy=false;render();}
 }
 document.querySelectorAll('[data-lang]').forEach(e=>e.addEventListener('click',()=>{lang=e.dataset.lang;render();}));
 retry.addEventListener('click',()=>submit(lastAction));withdraw.addEventListener('click',()=>submit('unsubscribe'));
 if(valid)submit('confirm');else{state='missing';render();}
})();
