/* No credentials belong here. Same-origin Functions are the only form endpoints. */
(()=>{
 const messages={
  es:{receivedCareers:'Solicitud recibida. Revisa tu correo para confirmar los avisos laborales si recibes un mensaje de verificación.',privacyRead:'Leer la política de privacidad',testing:'Demostración de conexión: utiliza solo datos de prueba. Estos envíos sí se procesan por los servicios externos.',sending:'Enviando…',receivedSubscribe:'Solicitud recibida. Revisa tu correo y confirma la suscripción si recibes un mensaje de verificación.',receivedSamples:'Solicitud enviada. Te responderemos por email.',invalid:'Revisa los campos y vuelve a intentarlo.',consent:'Acepta el consentimiento y revisa la política de privacidad actualizada.',challenge:'Completa la comprobación de seguridad e inténtalo de nuevo.',rate:'Has realizado varios intentos. Espera una hora antes de volver a intentarlo.',unavailable:'No hemos podido confirmar el envío. Tus datos siguen en el formulario; inténtalo más tarde.',pending:'Tu solicitud está pendiente de confirmación técnica. No podemos confirmar el envío todavía; no es necesario repetirla.',conflict:'La solicitud ha cambiado. Cierra y vuelve a abrir la página antes de intentarlo de nuevo.'},
  en:{receivedCareers:'Request received. Check your inbox to confirm career updates if you receive a verification email.',privacyRead:'Read the privacy policy',testing:'Connection demonstration: use test details only. These submissions are processed by external services.',sending:'Sending…',receivedSubscribe:'Request received. Check your inbox and confirm your subscription if you receive a verification email.',receivedSamples:'Request sent. We will reply by email.',invalid:'Please review the fields and try again.',consent:'Please accept the consent and review the updated privacy policy.',challenge:'Complete the security check and try again.',rate:'There have been several attempts. Please wait an hour before trying again.',unavailable:'We could not confirm your submission. Your details remain in the form; please try again later.',pending:'Your request is awaiting technical confirmation. We cannot confirm submission yet; there is no need to repeat it.',conflict:'The request has changed. Close and reopen the page before trying again.'}
 };
 for(const lang of ['es','en'])Object.assign(copy[lang],messages[lang]);
 const forms=[...document.querySelectorAll('form[data-form-kind]')],widgets=new Map(),widgetSizes=new Map(),requests=new Map();
 let settings=null,loadingChallenge=null;
 const confirmationDialog=document.getElementById('subscription-pending-dialog');
 confirmationDialog.querySelector('[data-confirmation-close]').addEventListener('click',()=>confirmationDialog.close());
 confirmationDialog.addEventListener('close',()=>document.querySelector('[data-open="subscribe-dialog"]').focus({preventScroll:true}));
 function status(form,key,error=false){const el=form.querySelector('.status');el.dataset.message=key;el.dataset.error=String(error);el.textContent=copy[language][key];}
 function refresh(){
  document.querySelectorAll('[data-privacy-read]').forEach(e=>e.textContent=copy[language].privacyRead);
  for(const form of forms){const note=form.querySelector('.demo');note.hidden=Boolean(settings?.enabled[form.dataset.formKind]&&settings.verified);note.textContent=settings?.enabled[form.dataset.formKind]?copy[language].testing:copy[language].demo;}
  if(settings?.siteLive){document.querySelector('.preview-notice').hidden=true;document.title='CIM Studio — Private Access';}
 }
 function loadChallenge(){
  if(loadingChallenge)return loadingChallenge;
  loadingChallenge=new Promise((resolve,reject)=>{window.cimTurnstileReady=resolve;const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cimTurnstileReady';script.async=true;script.onerror=reject;document.head.append(script);});
  return loadingChallenge;
 }
 async function renderChallenges(){
  if(!settings?.siteKey)return;
  try{await loadChallenge();for(const form of forms){if(!settings.enabled[form.dataset.formKind]||!form.closest('dialog').open)continue;const size=form.querySelector('.challenge-slot').clientWidth<300?'compact':'flexible';widgetSizes.set(form,size);if(widgets.has(form))window.turnstile.remove(widgets.get(form));widgets.set(form,window.turnstile.render(form.querySelector('.challenge-slot'),{sitekey:settings.siteKey,action:form.dataset.formKind,theme:'light',language,size}));}}
  catch{for(const form of forms)if(settings.enabled[form.dataset.formKind])status(form,'unavailable',true);}
 }
 window.addEventListener('cim:language',()=>{refresh();renderChallenges();});
 for(const form of forms)new MutationObserver(()=>{if(form.closest('dialog').open)renderChallenges();}).observe(form.closest('dialog'),{attributes:true,attributeFilter:['open']});
 window.addEventListener('resize',()=>{if(forms.some(form=>form.closest('dialog').open&&widgets.has(form)&&widgetSizes.get(form)!==(form.querySelector('.challenge-slot').clientWidth<300?'compact':'flexible')))renderChallenges();});
 forms.forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;
  if(form.dataset.formKind==='careers'&&!form.reportValidity())return;
  if(!settings?.enabled[form.dataset.formKind]){status(form,'status');return;}
  if(!form.reportValidity())return;
  const widget=widgets.get(form),token=widget!==undefined?window.turnstile?.getResponse(widget):null;
  if(!token){status(form,'challenge',true);return;}
  const values=new FormData(form),kind=form.dataset.formKind;
  const data={email:values.get('email'),consent:values.get(kind==='subscribe'?'marketing_consent':kind==='careers'?'careers_consent':'contact_consent')==='on',language,website:values.get('website')||'',legalVersion:settings.legalVersion};
  if(kind==='samples')for(const field of ['name','company','discipline','project'])data[field]=values.get(field);
  const fingerprint=JSON.stringify(data);let entry=requests.get(form);if(!entry||entry.fingerprint!==fingerprint){entry={fingerprint,id:crypto.randomUUID()};requests.set(form,entry);}
  const button=form.querySelector('button[type=submit]');button.disabled=true;form.setAttribute('aria-busy','true');status(form,'sending');
  try{
   const response=await fetch('/api/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token,requestId:entry.id}),signal:AbortSignal.timeout(45000)});
   const result=await response.json();
   if(!response.ok||result.ok!==true){const key=Object.hasOwn(messages[language],result.error)?result.error:'unavailable';status(form,key,true);return;}
   status(form,kind==='subscribe'?'receivedSubscribe':kind==='careers'?'receivedCareers':'receivedSamples');form.reset();requests.delete(form);
   // A queued API request is not a confirmed subscriber or a Founders entitlement.
   // Replays/existing contacts have no promise that a new confirmation email was sent.
   if(kind==='subscribe'&&response.status===202&&result.subscription==='confirmation_required'){
    form.closest('dialog').close();confirmationDialog.showModal();
   }
  }catch{status(form,'unavailable',true);}
  finally{button.disabled=false;form.removeAttribute('aria-busy');if(widget!==undefined)window.turnstile?.reset(widget);}
 }));
 refresh();
 fetch('/api/config',{headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>{if(!value||!value.enabled||typeof value.enabled.subscribe!=='boolean'||typeof value.enabled.samples!=='boolean'||typeof value.verified!=='boolean')throw new Error();settings=value;window.cimFormSettings=value;refresh();updateLegal();renderChallenges();}).catch(()=>{/* Stay in the existing demonstration, never imply that a submission succeeded. */});
})();
