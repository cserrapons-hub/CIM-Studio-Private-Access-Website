// Public samples/career registrations: purpose-separated D1, no GetResponse writes.
import {json,validate,validateSampleRequest,readJson,hash,Rejection} from './forms.js';
import {legal,legalReady,consent} from './settings.js';
import {registrationTestBoundary,registrationTestReady,validateRegistrationTestData} from './registration-test-scope.js';
import {auditStatement} from './registration-audit.js';
import {registrationReady} from './registration-settings.js';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const sectorNames={'interior-design':'Interiorismo',architecture:'Arquitectura',hospitality:'Hotelería',gastronomy:'Gastronomía y restauración',other:'Otros'};
const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const base64=value=>btoa(String.fromCharCode(...new Uint8Array(value)));
const keyFor=(env,kind)=>crypto.subtle.importKey('raw',bytes(env[kind==='careers'?'CAREERS_DATA_KEY':'SAMPLES_DATA_KEY']),'AES-GCM',false,['encrypt','decrypt']);
export async function encryptRegistration(env,kind,id,value){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(id)},await keyFor(env,kind),encoder.encode(JSON.stringify(value)));return base64(iv)+'.'+base64(encrypted);}
export async function decryptRegistration(env,kind,id,value){const [iv,ciphertext]=value.split('.');return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:encoder.encode(id)},await keyFor(env,kind),bytes(ciphertext))));}
async function receiptStatus(db,id){
 // Storage success is not mail acceptance; neither establishes delivery.
 const rows=(await db.prepare('SELECT state FROM registration_mail WHERE registration_id=?').bind(id).all()).results;
 const states=rows.map(row=>row.state);
 const mailState=states.includes('unknown')?'uncertain':states.includes('rejected')?'rejected':states.length&&states.every(state=>state==='accepted')?'accepted':'pending';
 return {mail:mailState==='accepted'?'accepted':'pending',mailState,deliveryVerified:false};
}
const database=(env,kind)=>kind==='careers'?env.CAREERS_DB:env.FORMS_DB;
async function checkStore(db,kind){await db.prepare('INSERT OR IGNORE INTO registration_store(id,purpose) VALUES(1,?)').bind(kind).run();if((await db.prepare('SELECT purpose FROM registration_store WHERE id=1').first())?.purpose!==kind)throw new Rejection('unavailable',503);}
async function rate(request,env,db,now,limit=8){const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw new Rejection('unavailable',503);const bucket=Math.floor(now.getTime()/3600000),id=await hash(env.AUDIT_HASH_SECRET,'registration-rate:'+ip+':'+bucket);const row=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,(bucket+1)*3600000).first();if(row.count>limit)throw new Rejection('rate',429);await db.prepare('DELETE FROM form_rate_limits WHERE expires_at<?').bind(now.getTime()).run();}
function sameOrigin(request,env){const url=new URL(request.url);if(url.origin!==new URL(env.REGISTRATION_ORIGIN).origin||request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);}
function messages(kind,lang,origin,token,privateTest=false){
 const preferences=origin+(privateTest?'/controlled/registrations/#':'/careers/preferences/#')+token;
 if(kind==='careers')return lang==='en'?{subject:'CIM Studio — Thank you for your interest',text:"Your interest in career opportunities at CIM Studio has been recorded. Confirm your email to activate these updates. This is not a job application or a subscription to our commercial newsletter, and it does not grant the Founders Rate.\n\nConfirm or withdraw these updates: "+preferences+'\n\nCIM STUDIO ESPJ · admin@cimstudio.es'}:{subject:'CIM Studio — Gracias por tu interés',text:'Hemos registrado tu interés en las oportunidades profesionales de CIM Studio. Confirma tu correo para activar estos avisos. No constituye una candidatura ni una suscripción a la newsletter comercial, y no concede la Tarifa Fundadores.\n\nConfirma o retira estos avisos: '+preferences+'\n\nCIM STUDIO ESPJ · admin@cimstudio.es'};
 return lang==='en'?{subject:'CIM Studio — We have received your sample request',text:'We have received your ceramic sample request and will review your request. Our team will contact you. This acknowledgement does not confirm professional pricing, sample availability or dispatch. It does not subscribe you to marketing or grant the Founders Rate.\n\nCIM STUDIO ESPJ · admin@cimstudio.es'}:{subject:'CIM Studio — Hemos recibido tu solicitud de muestras',text:'Hemos recibido tu solicitud de muestras cerámicas y revisaremos tu solicitud. Nuestro equipo se pondrá en contacto contigo. Este acuse no confirma Precio Profesional, disponibilidad ni envío de muestras. No implica suscripción comercial ni concede la Tarifa Fundadores.\n\nCIM STUDIO ESPJ · admin@cimstudio.es'};
}
export async function handleRegistration(request,env,kind,fetcher=fetch,now=new Date(),testPolicy=null){
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  if(testPolicy){const blocked=await registrationTestBoundary(request,env,kind,testPolicy);if(blocked)return blocked;}
  else if(!registrationReady(env,kind,legalReady()))return json({error:'unavailable'},503);
  const policyVersion=testPolicy?testPolicy.version:legal.version,policyConsent=testPolicy?{es:{[kind]:testPolicy.es.consent},en:{[kind]:testPolicy.en.consent}}:consent;
  sameOrigin(request,env);const raw=await readJson(request),data=kind==='samples'?validateSampleRequest(raw):validate(raw,kind);
  if(testPolicy)await validateRegistrationTestData(raw,data,env,kind);
  if(raw.legalVersion!==policyVersion)throw new Rejection('consent');
  const db=database(env,kind);await checkStore(db,kind);await rate(request,env,db,now);
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.token})});
  if(!response.ok)throw new Rejection('unavailable',503);const proof=await response.json();
  if(!proof.success||proof.hostname!==new URL(request.url).hostname||proof.action!==kind)throw new Rejection('challenge',403);
  const subject=await hash(env.AUDIT_HASH_SECRET,'registration-email:'+data.email),id=kind==='careers'?'careers:'+subject:'samples:'+raw.requestId;
  const fingerprint=await hash(env.AUDIT_HASH_SECRET,JSON.stringify(data)),prior=await db.prepare('SELECT state,fingerprint,consent_version FROM registrations WHERE id=?').bind(id).first();
  if(['pending','active'].includes(prior?.state)){
   if(testPolicy&&prior.consent_version!==policyVersion)throw new Rejection('conflict',409);
   if(kind==='samples'&&prior.fingerprint!==fingerprint)throw new Rejection('conflict',409);
   return json({ok:true,recorded:true,confirmationRequired:kind==='careers',...await receiptStatus(db,id)},202);
  }
  if(kind==='samples'){
   await db.prepare('DELETE FROM registration_submission_claims WHERE expires_at<?').bind(now.getTime()).run();
   await db.prepare('INSERT OR IGNORE INTO registration_submission_claims(fingerprint,request_id,registration_id,expires_at) VALUES(?,?,?,?)').bind(fingerprint,raw.requestId,id,now.getTime()+86400000).run();
   const owned=await db.prepare('SELECT * FROM registration_submission_claims WHERE request_id=?').bind(raw.requestId).first();
   if(owned&&owned.fingerprint!==fingerprint)throw new Rejection('conflict',409);
   const claim=await db.prepare('SELECT * FROM registration_submission_claims WHERE fingerprint=?').bind(fingerprint).first();
   if(!claim)throw new Rejection('conflict',409);
   if(claim.request_id!==raw.requestId){
    const original=await db.prepare('SELECT state FROM registrations WHERE id=?').bind(claim.registration_id).first();
    if(original?.state!=='active')throw new Rejection('pending',409);
    return json({ok:true,recorded:true,confirmationRequired:false,...await receiptStatus(db,claim.registration_id)},202);
   }
  }
  const at=now.toISOString(),review=new Date(now.getTime()+Number(env.REGISTRATION_REVIEW_DAYS)*86400000).toISOString();
  const token=kind==='careers'?Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''):null;
  const unsubscribeHash=token?await hash(env.AUDIT_HASH_SECRET,'career-unsubscribe:'+token):null;
  const encrypted=await encryptRegistration(env,kind,id,kind==='careers'?{email:data.email}:{version:2,email:data.email,name:data.name,company:data.company,discipline:data.discipline,shippingAddress:data.shippingAddress,postalCode:data.postalCode,city:data.city,province:data.province,country:data.country});
  const origin=new URL(env.REGISTRATION_ORIGIN).origin,receipt=messages(kind,data.language,origin,token,Boolean(testPolicy));
  const jobs=[{suffix:'receipt',payload:{from:env.MAIL_FROM,to:[data.email],subject:receipt.subject,text:receipt.text}}];
  if(kind==='samples')jobs.unshift({suffix:'admin',payload:{from:env.MAIL_FROM,to:['admin@cimstudio.es'],reply_to:data.email,subject:data.language==='en'?'CIM Studio — Ceramic sample request':'CIM Studio — Solicitud de muestras',text:`Nombre: ${data.name}\nEmail: ${data.email}\nEstudio: ${data.company}\nSector profesional: ${sectorNames[data.discipline]}\nIdioma: ${data.language}\nDirección de envío: ${data.shippingAddress}\nCódigo postal: ${data.postalCode}\nPoblación: ${data.city}\nProvincia: ${data.province}\nPaís: ${data.country}\n\nConsentimiento: ${policyConsent[data.language].samples}\nFecha: ${at}\nVersión: ${policyVersion}\nReferencia: ${id}`}});
  const statements=[db.prepare("INSERT INTO registrations(id,kind,subject_hash,fingerprint,encrypted_data,state,consent_request,consent_at,consent_version,consent_text,language,unsubscribe_hash,review_due,updated_at) VALUES(?,?,?,?,?,?, ?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET encrypted_data=excluded.encrypted_data,state=excluded.state,fingerprint=excluded.fingerprint,confirmed_at=NULL,consent_request=excluded.consent_request,consent_at=excluded.consent_at,consent_version=excluded.consent_version,consent_text=excluded.consent_text,language=excluded.language,unsubscribe_hash=excluded.unsubscribe_hash,review_due=excluded.review_due,updated_at=excluded.updated_at WHERE registrations.state='withdrawn'").bind(id,kind,subject,fingerprint,encrypted,kind==='careers'?'pending':'active',raw.requestId,at,policyVersion,policyConsent[data.language][kind],data.language,unsubscribeHash,review,at),
   db.prepare("INSERT OR IGNORE INTO registration_consent_events SELECT ?,id,'granted',?,?,?,? FROM registrations WHERE id=? AND consent_request=?").bind(id+':'+raw.requestId,at,policyVersion,policyConsent[data.language][kind],data.language,id,raw.requestId)];
  statements.push(await auditStatement(db,env,{eventId:id+':'+raw.requestId,registrationId:id,subjectHash:subject,event:'granted',at,policyVersion,text:policyConsent[data.language][kind],language:data.language}));
  for(const job of jobs){const jobId=id+':'+raw.requestId+':'+job.suffix;statements.push(db.prepare("INSERT OR IGNORE INTO registration_mail(id,registration_id,consent_request,encrypted_payload,state,updated_at) SELECT ?,id,?,?, 'pending',? FROM registrations WHERE id=? AND consent_request=?").bind(jobId,raw.requestId,await encryptRegistration(env,kind,jobId,job.payload),at,id,raw.requestId));}
  await db.batch(statements); // Contact, exact consent and encrypted mail jobs commit together.
  const saved=await db.prepare('SELECT state FROM registrations WHERE id=?').bind(id).first();if(!['pending','active'].includes(saved?.state))throw new Rejection('unavailable',503);
  try{await drainRegistrationMail(env,kind,fetcher,now,id,testPolicy);}catch{/* Durable registration remains valid; never log its data. */}
  return json({ok:true,recorded:true,confirmationRequired:kind==='careers',...await receiptStatus(db,id)},202);
 }catch(error){return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);}
}
export async function drainRegistrationMail(env,kind,fetcher=fetch,now=new Date(),onlyId=null,testPolicy=null,onlyJobId=null){
 // A scoped approval never opens the general queue or the public registration path.
 if(testPolicy&&(!onlyId||!registrationTestReady(env,kind,testPolicy)))return {accepted:0,pending:0,review:0};
 if(!testPolicy&&!registrationReady(env,kind,legalReady()))return {accepted:0,pending:0,review:0};
 const db=database(env,kind);await checkStore(db,kind);const seconds=Math.floor(now.getTime()/1000),at=now.toISOString();
 // An expired lease is uncertain. Do not send again beyond provider dedup guarantees.
 await db.prepare("UPDATE registration_mail SET state='unknown' WHERE state='sending' AND lease_until<?").bind(seconds).run();
 const query="SELECT * FROM registration_mail WHERE state='pending' AND next_attempt<=?"+(onlyId?' AND registration_id=?':'')+(onlyJobId?' AND id=?':'')+' LIMIT 10';
 const rows=(await db.prepare(query).bind(seconds,...(onlyId?[onlyId]:[]),...(onlyJobId?[onlyJobId]:[])).all()).results;let accepted=0;
 for(const row of rows){
  const contact=await db.prepare('SELECT state,consent_request FROM registrations WHERE id=?').bind(row.registration_id).first();
  if(!['pending','active'].includes(contact?.state)||contact.consent_request!==row.consent_request){await db.prepare("UPDATE registration_mail SET state='cancelled',encrypted_payload=NULL WHERE id=?").bind(row.id).run();continue;}
  const claim=await db.prepare("UPDATE registration_mail SET state='sending',attempts=attempts+1,lease_until=?,updated_at=? WHERE id=? AND state='pending' RETURNING id").bind(seconds+30,at,row.id).first();if(!claim)continue;
  try{
   const payload=await decryptRegistration(env,kind,row.id,row.encrypted_payload);
   const response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify(payload)});
   if(response.status===429){const exhausted=row.attempts+1>=5;await db.prepare('UPDATE registration_mail SET state=?,next_attempt=?,updated_at=? WHERE id=?').bind(exhausted?'rejected':'pending',seconds+Math.min(3600,60*2**row.attempts),at,row.id).run();continue;}
   if(!response.ok){await db.prepare("UPDATE registration_mail SET state=?,updated_at=? WHERE id=?").bind(response.status>=500?'unknown':'rejected',at,row.id).run();continue;}
   const body=await response.json();if(typeof body.id!=='string'||!/^[a-zA-Z0-9_.:-]{1,120}$/.test(body.id))throw Error();
   await db.prepare("UPDATE registration_mail SET state='accepted',provider_id=?,encrypted_payload=NULL,updated_at=? WHERE id=?").bind(body.id,at,row.id).run();accepted++;
  }catch{await db.prepare("UPDATE registration_mail SET state='unknown',updated_at=? WHERE id=?").bind(at,row.id).run();}
 }
 const pending=await db.prepare("SELECT COUNT(*) n FROM registration_mail WHERE state='pending'").first(),review=await db.prepare("SELECT COUNT(*) n FROM registration_mail WHERE state IN ('unknown','rejected')").first();
 return {accepted,pending:pending.n,review:review.n};
}
export async function withdrawCareerConsent(request,env,now=new Date(),testPolicy=null,fetcher=fetch){
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  if(testPolicy){const blocked=await registrationTestBoundary(request,env,'careers',testPolicy);if(blocked)return blocked;}
  // Withdrawal must remain available if acquisition is subsequently disabled.
  if(!env.CAREERS_DB||typeof env.AUDIT_HASH_SECRET!=='string'||env.AUDIT_HASH_SECRET.length<32||!env.REGISTRATION_ORIGIN)return json({error:'unavailable'},503);
  sameOrigin(request,env);const raw=await readJson(request);if(typeof raw.token!=='string'||!/^[a-f0-9]{64}$/.test(raw.token))throw new Rejection('invalid');
  const db=env.CAREERS_DB;await checkStore(db,'careers');await rate(request,env,db,now,30);const tokenHash=await hash(env.AUDIT_HASH_SECRET,'career-unsubscribe:'+raw.token);
  const contact=await db.prepare('SELECT * FROM registrations WHERE unsubscribe_hash=?').bind(tokenHash).first();
  if(testPolicy){
   await validateRegistrationTestData(raw,{email:typeof raw.email==='string'?raw.email.trim().toLowerCase():''},env,'careers');
   if(!contact||contact.consent_version!==testPolicy.version)throw new Rejection('invalid');
   const subject=await hash(env.AUDIT_HASH_SECRET,'registration-email:'+raw.email.trim().toLowerCase());
   if(contact.subject_hash!==subject)throw new Rejection('invalid');
  }
  if(raw.action==='confirm'){
   if(!(testPolicy?registrationTestReady(env,'careers',testPolicy):registrationReady(env,'careers',legalReady())))throw new Rejection('unavailable',503);
   if(contact?.state==='pending'){
    const at=now.toISOString(),jobId=contact.id+':'+contact.consent_request+':confirmed-admin';
    const owner=await decryptRegistration(env,'careers',contact.id,contact.encrypted_data);
    const payload={from:env.MAIL_FROM,to:['admin@cimstudio.es'],subject:'CIM Studio — Interés profesional confirmado',text:'Una persona ha confirmado su interés en recibir avisos de oportunidades profesionales.\n\nEmail: '+owner.email+'\nIdioma: '+contact.language+'\nConfirmación UTC: '+at+'\nVersión de consentimiento: '+contact.consent_version+'\n\nNo implica suscripción comercial ni Tarifa Fundadores.'};
    const encryptedPayload=await encryptRegistration(env,'careers',jobId,payload);
    await db.batch([
    db.prepare("UPDATE registrations SET state='active',confirmed_at=?,updated_at=? WHERE id=? AND state='pending' AND unsubscribe_hash=?").bind(now.toISOString(),now.toISOString(),contact.id,tokenHash),
    db.prepare("INSERT OR IGNORE INTO registration_consent_events SELECT ?,id,'confirmed',?,?,?,? FROM registrations WHERE id=? AND unsubscribe_hash=? AND state='active' AND consent_request=? AND confirmed_at=?").bind(contact.id+':confirmed:'+contact.consent_request,now.toISOString(),contact.consent_version,contact.consent_text,contact.language,contact.id,tokenHash,contact.consent_request,now.toISOString()),
    await auditStatement(db,env,{eventId:contact.id+':confirmed:'+contact.consent_request,registrationId:contact.id,subjectHash:contact.subject_hash,event:'confirmed',at:now.toISOString(),policyVersion:contact.consent_version,text:contact.consent_text,language:contact.language}),
    db.prepare("INSERT OR IGNORE INTO registration_mail(id,registration_id,consent_request,encrypted_payload,state,updated_at) SELECT ?,id,?,?,'pending',? FROM registrations WHERE id=? AND state='active' AND consent_request=? AND unsubscribe_hash=? AND confirmed_at=? AND EXISTS(SELECT 1 FROM registration_consent_events WHERE id=? AND event='confirmed')").bind(jobId,contact.consent_request,encryptedPayload,at,contact.id,contact.consent_request,tokenHash,at,contact.id+':confirmed:'+contact.consent_request)
    ]);
    // Only the confirmation notification is eligible here, never older mail jobs.
    try{await drainRegistrationMail(env,'careers',fetcher,now,contact.id,testPolicy,jobId);}catch{/* The confirmation and notification remain durable; no blind resend. */}
   }

   return json({ok:true},200);
  }
  if(raw.action!=='unsubscribe')throw new Rejection('invalid');
  if(['active','pending'].includes(contact?.state))await db.batch([
   db.prepare("INSERT OR IGNORE INTO registration_consent_events SELECT ?,id,'withdrawn',?,?,?,? FROM registrations WHERE id=? AND unsubscribe_hash=? AND state IN ('active','pending') AND consent_request=?").bind(contact.id+':withdraw:'+contact.consent_request,now.toISOString(),contact.consent_version,contact.consent_text,contact.language,contact.id,tokenHash,contact.consent_request),
   db.prepare("UPDATE registrations SET state='withdrawn',encrypted_data=NULL,updated_at=? WHERE id=? AND unsubscribe_hash=?").bind(now.toISOString(),contact.id,tokenHash),
   db.prepare("UPDATE registration_mail SET state='cancelled',encrypted_payload=NULL WHERE registration_id=? AND consent_request=? AND state IN ('pending','rejected','unknown')").bind(contact.id,contact.consent_request),
   await auditStatement(db,env,{eventId:contact.id+':withdraw:'+contact.consent_request,registrationId:contact.id,subjectHash:contact.subject_hash,event:'withdrawn',at:now.toISOString(),policyVersion:contact.consent_version,text:contact.consent_text,language:contact.language})
  ]);
  return json({ok:true},200); // Generic, idempotent; no contact enumeration.
 }catch(error){return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);}
}
