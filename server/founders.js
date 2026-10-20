// Server/operator-only. A public form submission, redirect or createdOn is never evidence.
export const FOUNDERS_CUTOFF='2026-12-31T23:00:00.000Z'; // 2027-01-01 00:00 Europe/Madrid, exclusive.
export const FOUNDERS_TERMS='founders-2026-v1';
const encoder=new TextEncoder();
const iso=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==value.slice(0,10))throw Error('An explicit verified timestamp with timezone is required');
 return new Date(value).toISOString();
};
const identifier=value=>{
 if(typeof value!=='string'||!/^[a-zA-Z0-9_.:-]{1,120}$/.test(value))throw Error('Invalid evidence identifier');
 return value;
};
export async function founderSubject(email,secret){
 if(typeof secret!=='string'||secret.length<32)throw Error('Audit secret missing');
 if(typeof email!=='string'||email.length>254||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email.trim()))throw Error('Invalid email');
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode('email:'+email.trim().toLowerCase())))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function prepareFounder(evidence,secret,now=new Date()){
 // These fields are an INTERNAL operator manifest, not a claimed GetResponse webhook/API schema.
 // The operator must first inspect an authentic provider confirmation artifact.
 if(!evidence||evidence.source!=='getresponse-confirmation'||evidence.reviewed!==true)throw Error('Reviewed confirmation evidence is required');
 const confirmedAt=iso(evidence.confirmedAt),verifiedAt=iso(evidence.verifiedAt);
 if(confirmedAt>=FOUNDERS_CUTOFF)throw Error('Confirmation outside Founders eligibility period');
 if(confirmedAt>verifiedAt||verifiedAt>now.toISOString())throw Error('Invalid evidence chronology');
 if(typeof evidence.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(evidence.evidenceSha256))throw Error('Evidence digest required');
 return {
  subjectHash:await founderSubject(evidence.email,secret),
  campaignId:identifier(evidence.campaignId),contactId:identifier(evidence.contactId),
  confirmedAt,verifiedAt,evidenceSha256:evidence.evidenceSha256,
  evidenceReference:identifier(evidence.evidenceReference),termsVersion:FOUNDERS_TERMS
 };
}
export const FOUNDER_INSERT='INSERT INTO founders_entitlements(subject_hash,campaign_id,contact_id,confirmed_at,verified_at,evidence_sha256,evidence_reference,terms_version) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING';
export const founderValues=record=>[record.subjectHash,record.campaignId,record.contactId,record.confirmedAt,record.verifiedAt,record.evidenceSha256,record.evidenceReference,record.termsVersion];
export async function recordFounder(db,record){
 await db.prepare(FOUNDER_INSERT).bind(...founderValues(record)).run();
 const saved=await db.prepare('SELECT * FROM founders_entitlements WHERE subject_hash=?').bind(record.subjectHash).first();
 if(!saved||saved.evidence_sha256!==record.evidenceSha256||saved.confirmed_at!==record.confirmedAt||saved.campaign_id!==record.campaignId||saved.contact_id!==record.contactId)
  throw Error('Evidence conflict: preserve the existing record and review manually');
 return saved;
}
export async function findFounder(db,email,secret){
 const subject=await founderSubject(email,secret);
 return db.prepare('SELECT confirmed_at,terms_version FROM founders_entitlements WHERE subject_hash=?').bind(subject).first();
}
