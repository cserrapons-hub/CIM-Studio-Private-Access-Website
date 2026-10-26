/* Server configuration controls availability; no credentials or tracking scripts. */
(()=>{
 const messages={
  es:{subscriber_type:'Selecciona Particular o Profesional.',recordedPendingMail:'Solicitud registrada. No podemos confirmar el envío del correo de recepción. No es necesario repetirla; si no llega, escribe a admin@cimstudio.es.',receivedCareers:'Hemos registrado tu solicitud. Los avisos se activarán solo cuando confirmes tu correo.',privacyRead:'Leer la política de privacidad',sending:'Enviando…',receivedSubscribe:'Solicitud recibida. Revisa tu correo y confirma la suscripción si recibes un mensaje de verificación.',receivedSamples:'Hemos registrado tu solicitud de muestras. Nuestro equipo se pondrá en contacto contigo.',invalid:'Revisa los campos y vuelve a intentarlo.',consent:'Acepta el consentimiento y revisa la política de privacidad actualizada.',challenge:'Completa la comprobación de seguridad e inténtalo de nuevo.',rate:'Has realizado varios intentos. Espera una hora antes de volver a intentarlo.',unavailable:'No hemos podido confirmar el envío. Tus datos siguen en el formulario; inténtalo más tarde.',pending:'Tu solicitud está pendiente de confirmación técnica. No podemos confirmar el envío todavía; no es necesario repetirla.',conflict:'La solicitud ha cambiado. Cierra y vuelve a abrir la página antes de intentarlo de nuevo.'},
  en:{subscriber_type:'Select Private individual or Professional.',recordedPendingMail:'Your request has been recorded, but we cannot confirm the acknowledgement email has been sent. Please do not resubmit; if it does not arrive, contact admin@cimstudio.es.',receivedCareers:'Your request has been recorded. Updates will only be activated once you confirm your email.',privacyRead:'Read the privacy policy',sending:'Sending…',receivedSubscribe:'Request received. Check your inbox and confirm your subscription if you receive a verification email.',receivedSamples:'Your sample request has been recorded. Our team will be in touch.',invalid:'Please review the fields and try again.',consent:'Please accept the consent and review the updated privacy policy.',challenge:'Complete the security check and try again.',rate:'There have been several attempts. Please wait an hour before trying again.',unavailable:'We could not confirm your submission. Your details remain in the form; please try again later.',pending:'Your request is awaiting technical confirmation. We cannot confirm submission yet; there is no need to repeat it.',conflict:'The request has changed. Close and reopen the page before trying again.'}
 };
 for(const lang of ['es','en'])Object.assign(copy[lang],messages[lang]);
 const forms=[...document.querySelectorAll('form[data-form-kind]')],widgets=new Map(),widgetSizes=new Map(),requests=new Map(),challenges=new Map();
 let settings=null,loadingChallenge=null;
 const confirmationDialog=document.getElementById('subscription-pending-dialog');
 confirmationDialog.querySelector('[data-confirmation-close]').addEventListener('click',()=>confirmationDialog.close());
 confirmationDialog.addEventListener('close',()=>document.querySelector('[data-open="subscribe-dialog"]').focus({preventScroll:true}));
 function showNewsletterResponse(form,mode){
  for(const panel of confirmationDialog.querySelectorAll('[data-newsletter-response]')){const active=panel.dataset.newsletterResponse===mode;panel.setAttribute('aria-hidden',String(!active));panel.inert=!active;}
  const prefix=mode==='confirmation'?'subscription-pending':'subscription-generic';
  confirmationDialog.setAttribute('aria-labelledby',prefix+'-title');
  confirmationDialog.setAttribute('aria-describedby',prefix+'-intro '+(mode==='confirmation'?'subscription-pending-instructions ':'')+prefix+'-help');
  form.closest('dialog').close();confirmationDialog.showModal();
 }
 const samplesResponseDialog=document.getElementById('samples-response-dialog');
 samplesResponseDialog.querySelector('[data-samples-response-close]').addEventListener('click',()=>samplesResponseDialog.close());
 samplesResponseDialog.addEventListener('close',()=>document.querySelector('[data-open="samples-dialog"]').focus({preventScroll:true}));
 function showSamplesResponse(form,result){
  const mode=result.receiptMailState==='accepted'?'accepted':'pending';
  for(const panel of samplesResponseDialog.querySelectorAll('[data-samples-response]')){const active=panel.dataset.samplesResponse===mode;panel.setAttribute('aria-hidden',String(!active));panel.inert=!active;}
  samplesResponseDialog.querySelector('.samples-delivery-help').hidden=mode!=='accepted';
  samplesResponseDialog.setAttribute('aria-describedby','samples-response-'+mode+(mode==='accepted'?' samples-delivery-help':''));
  form.closest('dialog').close();samplesResponseDialog.showModal();
 }
 function status(form,key,error=false){const el=form.querySelector('.status');delete el.dataset.security;el.dataset.message=key;el.dataset.error=String(error);el.textContent=copy[language][key];}
 function refresh(){
  // Public availability follows per-form runtime gates; internal trials have separate pages.
  document.querySelectorAll('[data-privacy-read]').forEach(e=>e.textContent=copy[language].privacyRead);
  for(const form of forms){const enabled=settings?.enabled[form.dataset.formKind]===true;form.querySelector('button[type=submit]').disabled=!enabled||form.getAttribute('aria-busy')==='true'||!challengeState(form).ready;const note=form.querySelector('.demo');note.hidden=enabled;note.textContent=enabled?'':copy[language].demo;}
  if(settings?.siteLive){document.querySelector('.preview-notice').hidden=true;document.title='CIM Studio — Private Access';}
 }
 // Widget state and errors belong only to the form that owns the challenge.
 function challengeState(form){
  if(!challenges.has(form))challenges.set(form,{ready:false,generation:0,rendering:null,timer:null,retries:0,language:null});
  return challenges.get(form);
 }
 function securityState(form,ready){
  challengeState(form).ready=ready;
  const message=form.querySelector('.status');
  if(ready){clearTimeout(challengeState(form).timer);challengeState(form).timer=null;if(message.dataset.security==='true'){message.textContent='';delete message.dataset.message;delete message.dataset.error;delete message.dataset.security;}}
  else if(form.getAttribute('aria-busy')!=='true'){status(form,'challenge',true);message.dataset.security='true';}
  refresh();
 }
 function loadChallenge(){
  if(window.turnstile?.render)return Promise.resolve();
  if(loadingChallenge)return loadingChallenge;
  const script=document.createElement('script');
  loadingChallenge=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Challenge load timeout')),15000);
   window.cimTurnstileReady=()=>{clearTimeout(timer);resolve();};
   script.onerror=()=>{clearTimeout(timer);reject(new Error('Challenge load failed'));};
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cimTurnstileReady';script.async=true;document.head.append(script);
  }).catch(error=>{script.remove();loadingChallenge=null;throw error;});
  return loadingChallenge;
 }
 function retryChallenge(form){
  const state=challengeState(form);
  if(state.timer||state.retries>=1||!form.closest('dialog').open)return;
  state.retries++;state.timer=setTimeout(()=>{state.timer=null;renderChallenge(form,true);},1000);
 }
 async function renderChallenge(form,force=false){
  const state=challengeState(form);
  if(!settings?.siteKey||!settings.enabled[form.dataset.formKind]||!form.closest('dialog').open||form.getAttribute('aria-busy')==='true')return;
  if(state.rendering)return state.rendering;
  const size=form.querySelector('.challenge-slot').clientWidth<300?'compact':'flexible';
  if(!force&&widgets.has(form)&&state.language===language&&widgetSizes.get(form)===size)return;
  state.ready=false;refresh();
  const generation=++state.generation;
  state.rendering=(async()=>{
   try{
    await loadChallenge();
    if(!form.closest('dialog').open)return;
    if(widgets.has(form)){const old=widgets.get(form);widgets.delete(form);window.turnstile.remove(old);}
    const current=()=>state.generation===generation;
    const failed=()=>{if(current()){securityState(form,false);retryChallenge(form);}};
    const id=window.turnstile.render(form.querySelector('.challenge-slot'),{
     sitekey:settings.siteKey,action:form.dataset.formKind,theme:'light',language,size,
     callback:token=>{if(current())securityState(form,typeof token==='string'&&token.length>0);},
     'expired-callback':()=>{if(current())securityState(form,false);},
     'timeout-callback':failed,'error-callback':failed
    });
    widgets.set(form,id);widgetSizes.set(form,size);state.language=language;
    // Also support an already-completed widget without relying on callback timing.
    securityState(form,Boolean(window.turnstile.getResponse(id)));
   }catch{if(state.generation===generation){securityState(form,false);retryChallenge(form);}}
  })().finally(()=>{state.rendering=null;
   if(form.closest('dialog').open&&widgets.has(form)&&(state.language!==language||widgetSizes.get(form)!==(form.querySelector('.challenge-slot').clientWidth<300?'compact':'flexible')))queueMicrotask(()=>renderChallenge(form));
  });
  return state.rendering;
 }
 function renderChallenges(){for(const form of forms)renderChallenge(form);}
 window.addEventListener('cim:language',()=>{refresh();renderChallenges();});
 for(const form of forms){
  new MutationObserver(()=>{
   const state=challengeState(form);
   if(form.closest('dialog').open){state.retries=0;renderChallenge(form,!state.ready);}
   else{clearTimeout(state.timer);state.timer=null;}
  }).observe(form.closest('dialog'),{attributes:true,attributeFilter:['open']});
  form.querySelector('.challenge-slot').addEventListener('click',()=>{if(!challengeState(form).ready){challengeState(form).retries=0;renderChallenge(form,true);}});
 }
 window.addEventListener('resize',renderChallenges);
 forms.forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;
  if(form.dataset.formKind==='careers'&&!form.reportValidity())return;
  if(!settings?.enabled[form.dataset.formKind]){status(form,'status');return;}
  if(!form.reportValidity())return;
  if(!challengeState(form).ready){securityState(form,false);retryChallenge(form);return;}
  const widget=widgets.get(form);let token;
  try{token=widget!==undefined?window.turnstile?.getResponse(widget):null;}catch{securityState(form,false);retryChallenge(form);return;}
  if(!token){securityState(form,false);retryChallenge(form);return;}
  const values=new FormData(form),kind=form.dataset.formKind;
  const data={email:values.get('email'),consent:values.get(kind==='subscribe'?'marketing_consent':kind==='careers'?'careers_consent':'contact_consent')==='on',language,website:values.get('website')||'',legalVersion:settings.legalVersion};
  if(kind==='subscribe')data.subscriberType=values.get('subscriberType');
  if(kind==='samples')for(const field of ['name','company','discipline','shippingAddress','postalCode','city','province','country'])data[field]=values.get(field);
  const fingerprint=JSON.stringify(data);let entry=requests.get(form);if(!entry||entry.fingerprint!==fingerprint){entry={fingerprint,id:crypto.randomUUID()};requests.set(form,entry);}
  const button=form.querySelector('button[type=submit]');button.disabled=true;form.setAttribute('aria-busy','true');status(form,'sending');
  try{
   const response=await fetch('/api/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token,requestId:entry.id}),signal:AbortSignal.timeout(45000)});
   const result=await response.json();
   if(!response.ok||result.ok!==true){if(kind==='subscribe'&&response.status===409&&result.error==='pending'){status(form,'pending',true);showNewsletterResponse(form,'generic');return;}const key=Object.hasOwn(messages[language],result.error)?result.error:'unavailable';status(form,key,true);return;}
   if(kind==='samples'){
    if(result.recorded!==true){status(form,'unavailable',true);return;}
    const previousStatus=form.querySelector('.status');previousStatus.textContent='';delete previousStatus.dataset.message;delete previousStatus.dataset.error;
    form.reset();requests.delete(form);showSamplesResponse(form,result);return;
   }
   status(form,result.mail==='pending'?'recordedPendingMail':kind==='subscribe'?'receivedSubscribe':kind==='careers'?'receivedCareers':'receivedSamples',result.mail==='pending');form.reset();requests.delete(form);
   // A queued API request is not a confirmed subscriber or a Founders entitlement.
   // Replays/existing contacts have no promise that a new confirmation email was sent.
   if(kind==='subscribe')showNewsletterResponse(form,response.status===202&&result.subscription==='confirmation_required'?'confirmation':'generic');
  }catch{status(form,kind==='subscribe'?'pending':'unavailable',true);}
  finally{form.removeAttribute('aria-busy');challengeState(form).ready=false;refresh();if(widget!==undefined){try{window.turnstile?.reset(widget);}catch{securityState(form,false);}}}
 }));
 refresh();
 fetch('/api/config',{headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>{if(!value||!value.enabled||typeof value.enabled.subscribe!=='boolean'||typeof value.enabled.samples!=='boolean'||typeof value.verified!=='boolean')throw new Error();settings=value;window.cimFormSettings=value;refresh();updateLegal();renderChallenges();}).catch(()=>{/* Stay in the existing demonstration, never imply that a submission succeeded. */});
})();
