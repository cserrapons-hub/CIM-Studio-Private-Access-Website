import {json,readJson,hash,Rejection} from './forms.js';
import {readGetResponse,verifyNewsletter} from './getresponse-newsletter.js';
import {ORIGIN,CAMPAIGN,referralTest} from './referral-environment.js';
export {ORIGIN} from './referral-environment.js';
const validEmail=e=>typeof e==='string'&&e.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e.trim());
const email=e=>e.trim().toLowerCase();
const codeOk=c=>typeof c==='string'&&/^[a-f0-9]{24}$/.test(c);
const tokenOk=t=>typeof t==='string'&&/^[a-f0-9]{48}$/.test(t);
const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
const digest=(env,kind,v)=>hash(env.AUDIT_HASH_SECRET,'referral-v1:'+kind+':'+v);
const now=()=>new Date().toISOString();
const database=env=>env.FORMS_DB;
const enabled=env=>env.REFERRALS_ENABLED==='true'&&env.FORMS_DB&&env.AUDIT_HASH_SECRET?.length>=32&&env.RESEND_API_KEY&&env.MAIL_FROM&&env.GETRESPONSE_API_KEY&&env.TURNSTILE_SECRET_KEY&&env.NEWSLETTER_DATA_KEY&&(env.REFERRALS_TEST_MODE==='true'?Boolean(referralTest(env)):env.GETRESPONSE_CAMPAIGN_ID===CAMPAIGN&&env.NEWSLETTER_ORIGIN===ORIGIN);
const checkOrigin=(request,origin)=>{const u=new URL(request.url);if(u.origin!==origin||request.headers.get('Origin')!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403)};
async function challenge(request,env,token,action){if(typeof token!=='string'||token.length>2048)throw new Rejection('challenge');const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Rejection('unavailable',503);const v=await r.json();if(v.success!==true||v.hostname!==new URL(request.url).hostname||v.action!==action)throw new Rejection('challenge',403)}
export async function throttle(request,env,purpose){const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw new Rejection('unavailable',503);const bucket=Math.floor(Date.now()/3600000),key=await digest(env,'rate',purpose+':'+ip+':'+bucket);const row=await database(env).prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*3600000).first();if(row.count>5)throw new Rejection('rate',429)}
async function encrypt(env,value,context){const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(env.NEWSLETTER_DATA_KEY),c=>c.charCodeAt(0)),'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(value));return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(data)))}
async function decrypt(env,value,context){const [a,b]=value.split('.'),key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(env.NEWSLETTER_DATA_KEY),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']);const iv=Uint8Array.from(atob(a),c=>c.charCodeAt(0)),cipher=Uint8Array.from(atob(b),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,cipher))}
async function mail(env,to,link){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:'Tu enlace personal para recomendar CIM Studio',text:'Gracias por ayudar a dar a conocer CIM Studio. Accede a tu enlace personal desde aquí:\\n\\n'+link+'\\n\\nSi no lo has solicitado, ignora este mensaje.\\n\\nMagda y Cati'}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Rejection('unavailable',503);await r.body?.cancel()}
export async function handleReferralLink(request,env){try{if(request.method!=='POST')return json({error:'method'},405);if(!enabled(env))return json({error:'unavailable'},503);const preview=referralTest(env),origin=preview?.origin??ORIGIN;checkOrigin(request,origin);const data=await readJson(request);if(!validEmail(data.email)||data.website)throw new Rejection('invalid');if(preview&&!preview.emails.has(email(data.email)))throw new Rejection('invalid',403);await throttle(request,env,'link');await challenge(request,env,data.token,'referral');const normalized=email(data.email),owner=await digest(env,'owner',normalized),db=database(env);let row=await db.prepare('SELECT code FROM referral_owners WHERE owner_hash=?').bind(owner).first();const referralCode=row?.code||random(12);if(!row){await db.prepare('INSERT OR IGNORE INTO referral_owners(owner_hash,code,email_cipher,created_at) VALUES(?,?,?,?)').bind(owner,referralCode,await encrypt(env,normalized,owner),now()).run();row=await db.prepare('SELECT code FROM referral_owners WHERE owner_hash=?').bind(owner).first()}const token=random(24),tokenHash=await digest(env,'token',token);await db.prepare('INSERT INTO referral_access(token_hash,owner_hash,expires_at,created_at) VALUES(?,?,?,?)').bind(tokenHash,owner,Date.now()+7*86400000,now()).run();await mail(env,normalized,origin+'/recomienda/#acceso='+token);return json({ok:true,message:'Si la dirección es válida, recibirás un enlace por correo.'},202)}catch(e){return json({error:e instanceof Rejection?e.code:'unavailable'},e instanceof Rejection?e.status:503)}}
export async function ownerForToken(env,token){if(!tokenOk(token))throw new Rejection('invalid');const tokenHash=await digest(env,'token',token),row=await database(env).prepare('SELECT owner_hash FROM referral_access WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();if(!row)throw new Rejection('invalid',403);return row.owner_hash}
async function verifiedSubscriber(env,item){
 const address=await decrypt(env,item.email_cipher,item.subject_hash);
 const contacts=await readGetResponse(fetch,env.GETRESPONSE_API_KEY,'/contacts?'+new URLSearchParams({
  'query[email]':address,'query[campaignId]':env.GETRESPONSE_CAMPAIGN_ID,perPage:'100'
 }),'contacts');
 if(!Array.isArray(contacts)||contacts.length>=100)throw new Rejection('unavailable',503);
 return contacts.some(contact=>contact?.email?.trim().toLowerCase()===address&&
  contact.campaign?.campaignId===env.GETRESPONSE_CAMPAIGN_ID&&
  (contact.status===undefined||contact.status==='active')&&
  Date.parse(contact.createdOn)>=Math.floor(Date.parse(item.accepted_at)/1000)*1000-60000&&
  contact.customFieldValues?.some(field=>field.customFieldId===env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID&&field.value?.includes('profesional')));
}

export async function reconcileReferrals(env){
 if(!enabled(env)||env.REFERRALS_AUTOMATION_ENABLED!=='true'||!env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID)return;
 const preview=referralTest(env),origin=preview?.origin??ORIGIN;
 await verifyNewsletter(env.GETRESPONSE_API_KEY,env.GETRESPONSE_CAMPAIGN_ID,fetch,preview?.campaignName);
 const db=database(env),timestamp=Date.now();
 const pending=(await db.prepare(
  "SELECT s.*,r.accepted_at FROM referral_signups s JOIN newsletter_http_receipts r USING(request_id) "+
  "LEFT JOIN referral_poll p USING(subject_hash) WHERE s.status='pending' AND COALESCE(p.next_at,0)<=? ORDER BY COALESCE(p.next_at,0),s.created_at LIMIT 10"
 ).bind(timestamp).all()).results;
 for(const item of pending){
  const claim=await db.prepare(
   'INSERT INTO referral_poll(subject_hash,next_at) VALUES(?,?) ON CONFLICT(subject_hash) DO UPDATE SET next_at=excluded.next_at WHERE next_at<=? RETURNING subject_hash'
  ).bind(item.subject_hash,timestamp+900000,timestamp).first();
  if(!claim)continue;
  try{
   if(!await verifiedSubscriber(env,item))continue;
  }catch{
   console.error('referral_confirmation_retry');
   continue;
  }
  const at=now();
  await db.batch([
   db.prepare("UPDATE referral_signups SET status='confirmed',confirmed_at=? WHERE subject_hash=? AND status='pending'").bind(at,item.subject_hash),
   ...[[item.owner_hash,'referrer'],[item.subject_hash,'referred']].map(([owner,kind])=>
    db.prepare('INSERT OR IGNORE INTO referral_coupons(coupon_id,owner_hash,source_subject_hash,kind,created_at) VALUES(?,?,?,?,?)')
     .bind(random(16),owner,item.subject_hash,kind,at)),
  ]);
 }
 // Recover any pre-existing confirmed referrals whose coupon inserts were interrupted.
 await db.batch(['referrer','referred'].map(kind=>db.prepare(
  "INSERT OR IGNORE INTO referral_coupons(coupon_id,owner_hash,source_subject_hash,kind,created_at) "+
  "SELECT lower(hex(randomblob(16))), "+(kind==='referrer'?'s.owner_hash':'s.subject_hash')+
  ", s.subject_hash, ?, s.confirmed_at FROM referral_signups s WHERE s.status='confirmed' "+
  "AND NOT EXISTS(SELECT 1 FROM referral_coupons c WHERE c.source_subject_hash=s.subject_hash AND c.kind=?) LIMIT 20"
 ).bind(kind,kind)));
 const outstanding=(await db.prepare(
  'SELECT c.coupon_id,c.owner_hash,CASE WHEN c.kind=\'referrer\' THEN o.email_cipher ELSE s.email_cipher END AS email_cipher '+
  'FROM referral_coupons c JOIN referral_signups s ON s.subject_hash=c.source_subject_hash '+
  'JOIN referral_owners o ON o.owner_hash=s.owner_hash LEFT JOIN referral_coupon_delivery d USING(coupon_id) '+
  'WHERE d.coupon_id IS NULL ORDER BY c.created_at LIMIT 10'
 ).all()).results;
 for(const coupon of outstanding){
  try{
   const to=await decrypt(env,coupon.email_cipher,coupon.owner_hash);
   if(preview&&!preview.emails.has(to))continue;
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'referral-coupon/'+coupon.coupon_id},
    body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:'Tienes un descuento de 5 € en CIM Studio',
     text:'Hemos añadido un descuento de 5 € a este correo. Solicita tu enlace personal con esta misma dirección para consultar y aplicar tus descuentos: '+origin+'/recomienda/#mi-enlace'}),
   });
   await response.body?.cancel();
   if(response.ok)await db.prepare('INSERT OR IGNORE INTO referral_coupon_delivery(coupon_id,delivered_at) VALUES(?,?)').bind(coupon.coupon_id,now()).run();
  }catch{console.error('referral_coupon_delivery_retry');}
 }
}
export async function handleReferralDashboard(request,env){
 try{
  if(request.method!=='GET')return json({error:'method'},405);
  if(!enabled(env))return json({error:'unavailable'},503);
  const origin=referralTest(env)?.origin??ORIGIN;
  if(new URL(request.url).origin!==origin)throw new Rejection('origin',403);
  const token=request.headers.get('X-Referral-Access')??request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{48})$/)?.[1];
  const owner=await ownerForToken(env,token),db=database(env);
  const row=await db.prepare('SELECT code FROM referral_owners WHERE owner_hash=?').bind(owner).first();
  if(!row)throw new Rejection('invalid',403);
  const counts=await db.prepare("SELECT COUNT(CASE WHEN status='confirmed' THEN 1 END) AS confirmed,COUNT(CASE WHEN status='pending' THEN 1 END) AS pending FROM referral_signups WHERE owner_hash=?").bind(owner).first();
  const coupons=await db.prepare('SELECT COUNT(*) AS n FROM referral_coupons c WHERE owner_hash=? AND redeemed_at IS NULL AND NOT EXISTS(SELECT 1 FROM cajita_reservations r WHERE r.coupon_id=c.coupon_id)').bind(owner).first();
  return json({ok:true,url:origin+'/recomienda/?r='+row.code,...counts,availableCoupons:coupons.n});
 }catch(e){return json({error:e instanceof Rejection?e.code:'unavailable'},e instanceof Rejection?e.status:503);}
}
export async function recordReferralSignup(env,{email:address,referralCode,referrerEmail,requestId}){if(!enabled(env)||(!codeOk(referralCode)&&!validEmail(referrerEmail)))return;const preview=referralTest(env);if(preview&&(!preview.emails.has(email(address))||(!codeOk(referralCode)&&!preview.emails.has(email(referrerEmail)))))return;const db=database(env),owner=codeOk(referralCode)?await db.prepare('SELECT owner_hash FROM referral_owners WHERE code=?').bind(referralCode).first():{owner_hash:await digest(env,'owner',email(referrerEmail))};if(!owner)return;const subject=await digest(env,'owner',email(address));if(subject===owner.owner_hash)return;if(!codeOk(referralCode)){await db.prepare('INSERT OR IGNORE INTO referral_owners(owner_hash,code,email_cipher,created_at) VALUES(?,?,?,?)').bind(owner.owner_hash,random(12),await encrypt(env,email(referrerEmail),owner.owner_hash),now()).run()}const cipher=await encrypt(env,email(address),subject);await db.prepare("INSERT OR IGNORE INTO referral_signups(subject_hash,owner_hash,email_cipher,request_id,status,created_at) VALUES(?,?,?,?,'pending',?)").bind(subject,owner.owner_hash,cipher,requestId,now()).run()}
