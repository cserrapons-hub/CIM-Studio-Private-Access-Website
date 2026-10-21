// Server-only preparation. No fetch, public route, subscription or Founders grant.
import {GETRESPONSE_HTML_ENDPOINT,GETRESPONSE_LIST} from './getresponse-form.js';
import {resolveNewsletterTestPolicy} from './newsletter-test-policy.js';
import {hash} from './forms.js';
export const NEWSLETTER_CONSENT=Object.freeze({name:'consentimiento',customFieldId:'njH9fM',value:'aceptado',htmlField:'custom_consentimiento'});
const encoder=new TextEncoder();
function email(value){
 if(typeof value!=='string')throw Error('invalid_email');
 const result=value.trim().toLowerCase();
 if(result.length>254||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(result))throw Error('invalid_email');
 return result;
}
export function prepareControlledHtml(input){
 if(input?.consent!==true)throw Error('consent_required');
 return {url:GETRESPONSE_HTML_ENDPOINT,options:{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:email(input.email),campaign_token:GETRESPONSE_LIST.token,[NEWSLETTER_CONSENT.htmlField]:NEWSLETTER_CONSENT.value}).toString()}};
}
function canonical(row){return JSON.stringify([row.request_id,row.subject_hash,row.accepted_at,row.purpose,row.language,row.consent_text,row.policy_version,row.custom_field_id,row.custom_value,row.encrypted_email]);}
export async function verifyConsentEvidence(row,secret){
 if(typeof secret!=='string'||secret.length<32)return false;
 const expected=await hash(secret,canonical(row));
 if(typeof row.evidence_mac!=='string'||row.evidence_mac.length!==expected.length)return false;
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^row.evidence_mac.charCodeAt(i);
 return mismatch===0;
}
export async function recordControlledConsent(env,input,now=new Date(),policy=resolveNewsletterTestPolicy(env)){
 // Evidence helper called only after the restricted handler guards.
 // Public signup remains disabled; this helper performs no network request.
 if(env.NEWSLETTER_TEST_LEGAL_APPROVED!=='true'||env.CONTROLLED_TEST_MODE!=='true'||env.NEWSLETTER_PREPARATION_ENABLED!=='true'||!env.FORMS_DB||!policy.approved||typeof policy.version!=='string'||!policy.version.trim())throw Error('preparation_disabled');
 return recordNewsletterConsent(env,input,now,policy);
}
// Internal evidence primitive. Only guarded handlers call it; it does not send anything.
export async function recordNewsletterConsent(env,input,now,policy){
 if(!env.FORMS_DB||!policy?.approved||typeof policy.version!=='string'||!policy.version.trim())throw Error('preparation_disabled');
 const prepared=prepareControlledHtml(input);
 if(!['es','en'].includes(input.language)||typeof policy[input.language]?.consent!=='string'||!policy[input.language].consent.trim()||input.legalVersion!==policy.version)throw Error('invalid_consent_version');
 if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.requestId))throw Error('invalid_request');
 if(typeof env.AUDIT_HASH_SECRET!=='string'||env.AUDIT_HASH_SECRET.length<32)throw Error('invalid_audit_key');
 let keyBytes;try{keyBytes=Uint8Array.from(atob(env.NEWSLETTER_DATA_KEY),c=>c.charCodeAt(0));}catch{throw Error('invalid_data_key');}
 if(keyBytes.length!==32)throw Error('invalid_data_key');
 const normalized=email(input.email),subject=await hash(env.AUDIT_HASH_SECRET,'newsletter-consent:'+normalized);
 const prior=await env.FORMS_DB.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(input.requestId).first();
 if(prior){
  if(!await verifyConsentEvidence(prior,env.AUDIT_HASH_SECRET)||prior.subject_hash!==subject||prior.language!==input.language||prior.policy_version!==policy.version)throw Error('request_conflict');
  return {prepared,evidence:prior,founders:'pending'};
 }
 const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(input.requestId)},key,encoder.encode(normalized));
 const b64=value=>btoa(String.fromCharCode(...new Uint8Array(value)));
 const row={request_id:input.requestId,subject_hash:subject,accepted_at:now.toISOString(),purpose:'newsletter-private-access',language:input.language,consent_text:policy[input.language].consent,policy_version:policy.version,custom_field_id:NEWSLETTER_CONSENT.customFieldId,custom_value:NEWSLETTER_CONSENT.value,encrypted_email:b64(iv)+'.'+b64(encrypted)};
 row.evidence_mac=await hash(env.AUDIT_HASH_SECRET,canonical(row));
 await env.FORMS_DB.prepare('INSERT OR IGNORE INTO newsletter_consent_requests(request_id,subject_hash,accepted_at,purpose,language,consent_text,policy_version,custom_field_id,custom_value,encrypted_email,evidence_mac) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.request_id,row.subject_hash,row.accepted_at,row.purpose,row.language,row.consent_text,row.policy_version,row.custom_field_id,row.custom_value,row.encrypted_email,row.evidence_mac).run();
 // Re-read to detect concurrent request-ID reuse, never return an unsaved record.
 const saved=await env.FORMS_DB.prepare('SELECT * FROM newsletter_consent_requests WHERE request_id=?').bind(input.requestId).first();
 if(!saved||!await verifyConsentEvidence(saved,env.AUDIT_HASH_SECRET)||saved.subject_hash!==subject||saved.language!==input.language||saved.policy_version!==policy.version)throw Error('request_conflict');
 return {prepared,evidence:saved,founders:'pending'};
}
export function inspectNewsletterContact(contact,expected){
 // Inspect an AUTHENTICATED API response only. This does not prove DOI/date.
 if(typeof contact?.email!=='string'||contact.email.trim().toLowerCase()!==email(expected.email)||contact?.campaign?.campaignId!==expected.campaignId||!expected.campaignId)return {customConsentStored:false,founders:'pending'};
 const fields=contact.customFieldValues;
 const matches=Array.isArray(fields)?fields.filter(f=>f.customFieldId===NEWSLETTER_CONSENT.customFieldId):[];
 const stored=matches.length===1&&Array.isArray(matches[0].value)&&matches[0].value.length===1&&matches[0].value[0]===NEWSLETTER_CONSENT.value;
 return {customConsentStored:stored,confirmationVerified:false,originalConfirmationAt:null,founders:'pending'};
}
