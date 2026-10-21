// Owner-only, read-only inspection. Never list or export every decrypted contact.
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {json,readJson,hash,Rejection} from './forms.js';
import {decryptRegistration} from './registrations.js';
import {inspectRegistrationAudit} from './registration-audit.js';
import {verifyConsentEvidence} from './getresponse-controlled.js';
export async function controlledReview(request,env){
 try{
  if(request.method!=='POST')return json({error:'method'},405,{Allow:'POST'});
  const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
  if(env.CONTROLLED_REVIEW_ENABLED!=='true')return json({error:'unavailable'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  const raw=await readJson(request);
  if(!['samples','careers','newsletter'].includes(raw.kind)||!['summary','record'].includes(raw.action))throw new Rejection('invalid');
  const db=raw.kind==='careers'?env.CAREERS_DB:env.FORMS_DB;if(!db)throw new Rejection('unavailable',503);
  if(raw.action==='summary'){
   const table=raw.kind==='newsletter'?'newsletter_html_deliveries':'registrations';
   const rows=(await db.prepare('SELECT state,COUNT(*) AS count FROM '+table+' GROUP BY state').all()).results;
   return json({ok:true,counts:rows});
  }
  if(typeof raw.id!=='string'||!/^[a-zA-Z0-9_:-]{1,180}$/.test(raw.id))throw new Rejection('invalid');
  if(raw.kind==='newsletter'){
   const row=await db.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(raw.id).first();if(!row)throw new Rejection('missing',404);
   const verified=await verifyConsentEvidence(row,env.AUDIT_HASH_SECRET);
   const observations=(await db.prepare('SELECT evidence_json,evidence_mac FROM newsletter_observations WHERE subject_hash=? ORDER BY observed_at').bind(row.subject_hash).all()).results;
   const checks=[];for(const item of observations)checks.push({evidence:JSON.parse(item.evidence_json),verified:await hash(env.AUDIT_HASH_SECRET,'newsletter-observation-v1:'+item.evidence_json)===item.evidence_mac});
   return json({ok:true,consent:{id:row.request_id,at:row.accepted_at,text:row.consent_text,version:row.policy_version,language:row.language,verified},observations:checks,founders:'pending'});
  }
  const row=await db.prepare('SELECT * FROM registrations WHERE id=? AND kind=?').bind(raw.id,raw.kind).first();if(!row)throw new Rejection('missing',404);
  const audit=await inspectRegistrationAudit(db,env,row);
  const data=row.encrypted_data?await decryptRegistration(env,raw.kind,row.id,row.encrypted_data):null;
  const mail=(await db.prepare('SELECT id,state,attempts,provider_id,updated_at FROM registration_mail WHERE registration_id=?').bind(row.id).all()).results;
  return json({ok:true,record:{id:row.id,state:row.state,data,consentAt:row.consent_at,consentText:row.consent_text,consentVersion:row.consent_version,confirmedAt:row.confirmed_at,reviewDue:row.review_due},audit,mail});
 }catch(error){return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);}
}
