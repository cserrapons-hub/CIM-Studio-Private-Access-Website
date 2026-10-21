import {hash} from './forms.js';
export async function auditStatement(db,env,record){
 const body=JSON.stringify({version:1,...record}),mac=await hash(env.AUDIT_HASH_SECRET,'registration-audit-v1:'+body);
 return db.prepare('INSERT OR IGNORE INTO registration_audit_seals(event_id,registration_id,evidence_json,evidence_mac) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM registration_consent_events WHERE id=?)').bind(record.eventId,record.registrationId,body,mac,record.eventId);
}
export async function inspectRegistrationAudit(db,env,record){
 const events=(await db.prepare('SELECT * FROM registration_consent_events WHERE registration_id=? ORDER BY occurred_at,id').bind(record.id).all()).results;
 if(!events.length)return {verified:false,reason:'missing_evidence'};
 for(const event of events){
  const seal=await db.prepare('SELECT * FROM registration_audit_seals WHERE event_id=?').bind(event.id).first();
  if(!seal)return {verified:false,reason:'legacy_or_missing_seal'};
  if(await hash(env.AUDIT_HASH_SECRET,'registration-audit-v1:'+seal.evidence_json)!==seal.evidence_mac)return {verified:false,reason:'invalid_seal'};
  const body=JSON.parse(seal.evidence_json);
  if(body.eventId!==event.id||body.registrationId!==record.id||body.subjectHash!==record.subject_hash||body.event!==event.event||body.at!==event.occurred_at||body.text!==event.consent_text||body.policyVersion!==event.consent_version||body.language!==event.language)return {verified:false,reason:'evidence_mismatch'};
 }
 const grant=events.find(e=>e.id===record.id+':'+record.consent_request);
 if(!grant||grant.event!=='granted'||grant.consent_text!==record.consent_text||grant.consent_version!==record.consent_version||grant.language!==record.language||grant.occurred_at!==record.consent_at)return {verified:false,reason:'record_mismatch'};
 const confirmed=events.find(e=>e.id===record.id+':confirmed:'+record.consent_request);
 const withdrawn=events.find(e=>e.id===record.id+':withdraw:'+record.consent_request);
 if((record.confirmed_at&&confirmed?.occurred_at!==record.confirmed_at)||(record.kind==='careers'&&record.state==='active'&&!confirmed)||(record.state==='withdrawn'&&!withdrawn)||(record.state!=='withdrawn'&&withdrawn)||(record.state==='pending'&&confirmed))return {verified:false,reason:'state_mismatch'};
 return {verified:true,events:events.length};
}
