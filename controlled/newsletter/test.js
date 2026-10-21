// No credentials, browser storage, tracking or automatic form submission.
(()=>{
 const copy={es:{observations:'Comprobaciones API de solo lectura: no acreditan por sí solas el doble opt-in ni su fecha.',before:'Observar antes de confirmar',after:'Observar después de confirmar',unsubscribe:'Observar después de la baja',title:'Ensayo privado de newsletter.',pageTitle:'CIM Studio — Ensayo privado',intro:'Solo para el correo propio autorizado. No activa la web pública ni concede la Tarifa Fundadores.',formTitle:'Solicitud de prueba',email:'Correo electrónico autorizado',send:'Enviar una solicitud de prueba',privacy:'Leer el aviso de privacidad de esta prueba',privacyTitle:'Privacidad del ensayo — borrador',close:'Cerrar',language:'Idioma',blocked:'Ensayo bloqueado. El aviso o la configuración todavía no están aprobados y habilitados.',ready:'Ensayo restringido preparado. Envía solo una solicitud autorizada.',version:'Versión',draft:'Borrador sin aprobación',unavailable:'No se ha podido comprobar el ensayo. El formulario sigue desactivado.',challenge:'Completa la comprobación de seguridad.',sending:'Procesando una única solicitud…',pending:'Verificación técnica pendiente. No repitas el envío. Revisa el buzón autorizado y el estado en GetResponse. Esto no acredita confirmación ni Fundadores.',error:'No podemos confirmar el envío. No lo repitas sin revisar antes el estado con la persona responsable.',rate:'Se ha alcanzado el límite de solicitudes. No repitas el envío.',consent:'Debes aceptar la casilla y revisar la información de privacidad vigente.'},en:{observations:'Read-only API checks do not in themselves prove double opt-in or its original date.',before:'Observe before confirmation',after:'Observe after confirmation',unsubscribe:'Observe after unsubscribe',title:'Private newsletter test.',pageTitle:'CIM Studio — Private test',intro:'For the authorised owner email only. This does not activate the public website or grant the Founders Rate.',formTitle:'Test request',email:'Authorised email address',send:'Send one test request',privacy:'Read this test’s privacy notice',privacyTitle:'Test privacy — draft',close:'Close',language:'Language',blocked:'Test blocked. The notice or configuration has not yet been approved and enabled.',ready:'Restricted test ready. Send only one authorised request.',version:'Version',draft:'Unapproved draft',unavailable:'The test could not be checked. The form remains disabled.',challenge:'Complete the security check.',sending:'Processing one request…',pending:'Technical verification pending. Do not resubmit. Check the authorised inbox and the GetResponse record. This does not establish confirmation or Founders eligibility.',error:'Submission could not be confirmed. Do not resubmit until the responsible person has checked its status.',rate:'The request limit has been reached. Do not resubmit.',consent:'You must accept the checkbox and review the current privacy information.'}};

 Object.assign(copy.es,{observationEmail:'Introduce un correo válido para consultar. Esta acción no solicita una suscripción.',observing:'Consultando el estado. Esta acción no solicita una suscripción.',observationSuccess:'Observación guardada. No se ha solicitado una suscripción ni acreditado el doble opt-in.',observationError:'No se ha podido completar la observación. Esta acción no solicita una suscripción. Conserva el diagnóstico y no repitas la consulta hasta revisarlo.',observationUnknown:'No se ha podido recibir el resultado de la observación. Podría haberse guardado; comprueba su estado antes de repetir. Esta acción no solicita una suscripción.'});
 Object.assign(copy.en,{observationEmail:'Enter a valid email to check its status. This action does not request a subscription.',observing:'Checking the current state. This action does not request a subscription.',observationSuccess:'Observation saved. No subscription was requested and double opt-in has not been established.',observationError:'The observation could not be completed. This action does not request a subscription. Keep the diagnostic and do not repeat the check until it has been reviewed.',observationUnknown:'The observation result could not be received. It may have been saved; check its state before repeating. This action does not request a subscription.'});
 const diagnosticStages=new Set(['configuration','request','allowlist','storage_rate_read','getresponse_campaign','getresponse_contacts','storage_consent_read','storage_observation_write']);
 const diagnosticCodes=new Set(['observation_unavailable','observation_disabled','private_policy_disabled','storage_configuration','campaign_configuration','audit_configuration','allowlist_configuration','request_invalid','origin_rejected','email_not_authorised','storage_read','observation_rate','campaign_network','campaign_http','campaign_response','campaign_identity','campaign_optin','contacts_network','contacts_http','contacts_response','contacts_incomplete','contacts_ambiguous','storage_write']);
 function safeDiagnostic(response,body){const value={operation:'observation',httpStatus:response.status};if(diagnosticStages.has(body?.diagnostic?.stage))value.stage=body.diagnostic.stage;if(diagnosticCodes.has(body?.diagnostic?.code))value.code=body.diagnostic.code;const status=body?.diagnostic?.providerStatus;if(Number.isInteger(status)&&status>=100&&status<=599)value.providerStatus=status;return value;}
 let lang='es',config=null,widget=null,loading=null,busy=false,settled=false,message='',requestId=null;
 const form=document.getElementById('newsletter-test'),fieldset=form.querySelector('fieldset'),dialog=document.getElementById('test-privacy');
 function render(){
  document.documentElement.lang=lang;document.title=copy[lang].pageTitle;document.querySelector('nav').setAttribute('aria-label',copy[lang].language);
  document.querySelectorAll('[data-lang]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.lang===lang)));
  document.querySelectorAll('[data-copy]').forEach(e=>e.textContent=copy[lang][e.dataset.copy]);
  document.getElementById('readiness').textContent=copy[lang][config?.enabled?'ready':'blocked'];
  document.getElementById('result').textContent=message?copy[lang][message]:'';
  if(config){document.getElementById('consent-text').textContent=config.policy[lang].consent;document.getElementById('privacy-text').textContent=config.policy[lang].privacy;document.getElementById('policy-version').textContent=copy[lang][config.policy.approved?'version':'draft']+': '+(config.policy.version||config.policy.revision);}
  fieldset.disabled=(!config?.enabled&&!config?.observationsEnabled)||busy||settled;
  form.querySelector('[type=submit]').disabled=!config?.enabled||busy||settled;
  document.querySelectorAll('[data-observe]').forEach(button=>button.disabled=!config?.observationsEnabled||busy);
 }
 async function challenge(){
  if(!config?.enabled||!config.siteKey||settled)return;
  try{
   if(!loading)loading=new Promise((resolve,reject)=>{window.cimPrivateNewsletterTurnstileReady=resolve;const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cimPrivateNewsletterTurnstileReady';script.async=true;script.onerror=reject;document.head.append(script);});
   await loading;if(widget!==null)window.turnstile.remove(widget);
   widget=window.turnstile.render(document.getElementById('challenge'),{sitekey:config.siteKey,action:'subscribe',language:lang,theme:'light',size:'compact'});
  }catch{config.enabled=false;message='unavailable';render();}
 }
 document.querySelectorAll('[data-lang]').forEach(e=>e.addEventListener('click',()=>{lang=e.dataset.lang;render();if(!busy)challenge();}));
 document.getElementById('privacy-link').addEventListener('click',e=>{e.preventDefault();dialog.showModal();});
 document.getElementById('privacy-close').addEventListener('click',()=>dialog.close());
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!config?.enabled||busy||settled||!form.reportValidity())return;
  const values=new FormData(form);if(values.get('consent')!=='on'){message='consent';render();return;}
  const token=widget!==null?window.turnstile?.getResponse(widget):null;if(!token){message='challenge';render();return;}
  if(!requestId)requestId=crypto.randomUUID();
  const data={email:values.get('email'),consent:true,language:lang,legalVersion:config.policy.version,requestId,token,website:values.get('website')||''};
  busy=true;message='sending';render();
  try{
   const response=await fetch('/api/controlled/subscribe',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
   const result=await response.json();message=response.status===409&&result.error==='pending'?'pending':result.error==='rate'?'rate':'error';
  }catch{message='error';}
  finally{busy=false;settled=true;render();if(widget!==null)window.turnstile?.reset(widget);}
 });
 document.querySelectorAll('[data-observe]').forEach(button=>button.addEventListener('click',async()=>{
  if(!config?.observationsEnabled||busy)return;
  const email=form.querySelector('[name=email]').value;if(!email||!form.querySelector('[name=email]').checkValidity()){message='observationEmail';render();return;}
  busy=true;message='observing';document.getElementById('observation-result').textContent='';render();
  try{
   const response=await fetch('/api/controlled/newsletter-observation',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,phase:button.dataset.observe}),signal:AbortSignal.timeout(30000)});
   let body;try{body=await response.json();}catch{body=null;}
   if(!response.ok||!body?.observation){message='observationError';document.getElementById('observation-result').textContent=JSON.stringify(safeDiagnostic(response,body),null,2);}
   else{message='observationSuccess';document.getElementById('observation-result').textContent=JSON.stringify(body.observation,null,2);}
  }catch{message='observationUnknown';document.getElementById('observation-result').textContent=JSON.stringify({operation:'observation',code:'browser_network_or_timeout'},null,2);}
  finally{busy=false;render();}
 }));
 render();
 fetch('/api/controlled/newsletter-config',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error();const value=await response.json();
  if(value.testOnly!==true||typeof value.enabled!=='boolean'||!value.policy||!['es','en'].every(l=>typeof value.policy[l]?.consent==='string'&&typeof value.policy[l]?.privacy==='string'))throw Error();
  if(value.enabled&&(!value.policy.approved||!value.policy.version||!value.siteKey))throw Error();config=value;render();await challenge();
 }).catch(()=>{config=null;message='unavailable';render();});
})();
