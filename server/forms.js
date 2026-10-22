// Historical non-routed adapter retained for regression reference. Public signup is blocked;
// public samples/careers use registrations.js. Custom API fields do NOT prove native consent.
import { verifyNewsletter } from './getresponse-newsletter.js';
import { ready, legal, consent } from './settings.js';
const RESPONSE_HEADERS = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
export function json(body, status = 200, extra = {}) { return new Response(JSON.stringify(body), {status,headers:{...RESPONSE_HEADERS,...extra}}); }
export class Rejection extends Error { constructor(code, status=400) { super(code); this.code=code; this.status=status; } }
function text(value, max, min=1) { if(typeof value!=='string') throw new Rejection('invalid'); value=value.trim(); if(value.length<min || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Rejection('invalid'); return value; }
export function validate(data, kind) {
  const email=text(data.email,254).toLowerCase();
  if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email)) throw new Rejection('invalid');
  if(data.consent!==true || !['es','en'].includes(data.language)) throw new Rejection('consent');
  if(data.website) throw new Rejection('invalid');
  if(typeof data.token!=='string' || !data.token || data.token.length>2048) throw new Rejection('challenge');
  if(typeof data.requestId!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.requestId)) throw new Rejection('invalid');
  const result={ email,language:data.language,consent:true };
  if(kind==='samples') {
    result.name=text(data.name,120); result.company=text(data.company,160); result.project=text(data.project,5000);
    if(!['interior-design','architecture','hospitality','other'].includes(data.discipline)) throw new Rejection('invalid');
    result.discipline=data.discipline;
  }
  return result;
}
// Current routed sample form. Legacy non-routed adapters retain their historical validation.
export function validateSampleRequest(data){
 const result=validate(data,'subscribe');
 result.name=text(data.name,120);result.company=text(data.company,160);
 if(!['interior-design','architecture','hospitality','gastronomy','other'].includes(data.discipline))throw new Rejection('invalid');
 result.discipline=data.discipline;
 for(const [field,max] of [['shippingAddress',250],['postalCode',20],['city',120],['province',120],['country',100]]){
  result[field]=text(data[field],max);
  if(/[\r\n]/.test(result[field]))throw new Rejection('invalid');
 }
 return result;
}
export async function readJson(request) {
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new Rejection('invalid',415);
  if(Number(request.headers.get('Content-Length'))>16384) throw new Rejection('invalid',413);
  const reader=request.body?.getReader(); if(!reader) throw new Rejection('invalid');
  let size=0; const chunks=[];
  for(;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>16384){await reader.cancel();throw new Rejection('invalid',413);} chunks.push(value); }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try { const value=JSON.parse(new TextDecoder().decode(bytes)); if(!value || Array.isArray(value) || typeof value!=='object') throw new Error(); return value; } catch {throw new Rejection('invalid');}
}
export async function hash(secret, value) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function remote(fetcher, url, options={}) {
  return fetcher(url,{...options,signal:AbortSignal.timeout(12000),redirect:'error'});
}
export async function handleSubmission(request, env, kind, fetcher=fetch, now=new Date()) {
  let id, submitted=false, owns=false;
  try {
    if(request.method!=='POST') return json({error:'method'},405,{Allow:'POST'});
    const url=new URL(request.url);
    if(request.headers.get('Origin')!==url.origin || request.headers.get('Sec-Fetch-Site')==='cross-site') throw new Rejection('origin',403);
    if(!ready(env,kind)) return json({error:'unavailable'},503);
    const raw=await readJson(request),data=validate(raw,kind);
    if(raw.legalVersion!==legal.version) throw new Rejection('consent');
    const db=kind==='careers'?env.CAREERS_DB:env.FORMS_DB;const at=now.toISOString(),subject=await hash(env.AUDIT_HASH_SECRET,'email:'+data.email);
    const ip=request.headers.get('CF-Connecting-IP'); if(!ip) throw new Rejection('unavailable',503);
    const bucket=Math.floor(now.getTime()/3600000),rateKey=await hash(env.AUDIT_HASH_SECRET,`rate:${ip}:${bucket}`);
    const rate=await db.prepare('INSERT INTO form_rate_limits(id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(rateKey,(bucket+1)*3600000).first();
    if(rate.count>8) return json({error:'rate'},429,{'Retry-After':'3600'});
    await db.prepare('DELETE FROM form_rate_limits WHERE expires_at < ?').bind(now.getTime()).run();
    const verification=await remote(fetcher,'https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:raw.token})});
    if(!verification.ok) throw new Rejection('unavailable',503);
    const challenge=await verification.json();
    if(!challenge.success || challenge.hostname!==url.hostname || challenge.action!==kind) throw new Rejection('challenge',403);
    id=kind==='samples'?'samples:'+raw.requestId:kind+':'+subject;
    const fingerprint=await hash(env.AUDIT_HASH_SECRET,JSON.stringify(data));
    const inserted=await db.prepare('INSERT INTO form_requests(id,kind,subject_hash,fingerprint,state,accepted_at,consent_version,consent_text,language,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(id,kind,subject,fingerprint,'processing',at,legal.version,consent[data.language][kind],data.language,at).first();
    if(!inserted) {
      const prior=await db.prepare('SELECT state,fingerprint FROM form_requests WHERE id=?').bind(id).first();
      if(prior.state==='accepted' && (kind!=='samples'||prior.fingerprint===fingerprint)) return json(kind==='subscribe'?{ok:true,subscription:'request_recorded'}:{ok:true},202);
      if(prior.fingerprint!==fingerprint) throw new Rejection('conflict',409);
      if(prior.state!=='failed') return json({error:'pending'},409);
      const reclaimed=await db.prepare("UPDATE form_requests SET state='processing',updated_at=?,accepted_at=?,consent_version=?,consent_text=?,language=? WHERE id=? AND state='failed' RETURNING id").bind(at,at,legal.version,consent[data.language][kind],data.language,id).first();
      if(!reclaimed) return json({error:'pending'},409);
    }
    owns=true;
    let providerId=null, subscription='request_recorded';
    if(kind==='subscribe'||kind==='careers') {
      const campaignId=kind==='careers'?env.GETRESPONSE_CAREERS_CAMPAIGN_ID:env.GETRESPONSE_CAMPAIGN_ID;
      if(kind==='subscribe') await verifyNewsletter(env.GETRESPONSE_API_KEY,campaignId,fetcher);
      const headers={'X-Auth-Token':'api-key '+env.GETRESPONSE_API_KEY,'Content-Type':'application/json'};
      const query=new URLSearchParams({'query[email]':data.email,'query[campaignId]':campaignId});
      const existing=await remote(fetcher,'https://api.getresponse.com/v3/contacts?'+query,{headers});
      if(!existing.ok) throw new Rejection('unavailable',503);
      const contacts=await existing.json();
      if(!Array.isArray(contacts)) throw new Rejection('unavailable',503);
      const match=contacts.find(c=>c.email?.toLowerCase()===data.email && c.campaign?.campaignId===campaignId);
      if(match) providerId=match.contactId;
      else {
        const customFieldValues=[
          {customFieldId:env.GR_CONSENT_AT_FIELD_ID,value:[at]},
          {customFieldId:env.GR_CONSENT_VERSION_FIELD_ID,value:[legal.version]},
          {customFieldId:env.GR_CONSENT_TEXT_FIELD_ID,value:[consent[data.language][kind]]},
          {customFieldId:env.GR_LANGUAGE_FIELD_ID,value:[data.language]}
        ];
        submitted=true;
        const response=await remote(fetcher,'https://api.getresponse.com/v3/contacts',{method:'POST',headers,body:JSON.stringify({email:data.email,campaign:{campaignId},customFieldValues})});
        if(response.status!==202){submitted=response.status>=500||response.status===409||response.ok;throw new Rejection('unavailable',503);}
        if(kind==='subscribe') subscription='confirmation_required';
      }
    } else {
      if(/[\r\n]/.test(env.MAIL_FROM) || !env.MAIL_FROM.includes('@')) throw new Rejection('unavailable',503);
      submitted=true;
      const response=await remote(fetcher,'https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:env.MAIL_FROM,to:['admin@cimstudio.es'],reply_to:data.email,subject:'CIM Studio — Solicitud de muestras',text:`Nombre: ${data.name}\nEmail: ${data.email}\nEstudio / empresa: ${data.company}\nProfesión: ${data.discipline}\nIdioma: ${data.language}\n\nProyecto:\n${data.project}\n\nConsentimiento: ${consent[data.language].samples}\nAceptado: ${at}\nVersión de privacidad: ${legal.version}`})});
      if(!response.ok){submitted=response.status>=500||response.status===409;throw new Rejection('unavailable',503);}
      const body=await response.json(); if(typeof body.id!=='string') throw new Error('Provider outcome unknown'); providerId=body.id;
    }
    await db.prepare("UPDATE form_requests SET state='accepted',provider_id=?,updated_at=? WHERE id=?").bind(providerId,at,id).run();
    return json(kind==='subscribe'?{ok:true,subscription}:{ok:true},202);
  } catch(error) {
    if(id && owns) {try{await (kind==='careers'?env.CAREERS_DB:env.FORMS_DB).prepare('UPDATE form_requests SET state=?,updated_at=? WHERE id=? AND state=\'processing\'').bind(submitted?'unknown':'failed',now.toISOString(),id).run();}catch{/* Never log personal data or provider responses. */}}
    return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);
  }
}
