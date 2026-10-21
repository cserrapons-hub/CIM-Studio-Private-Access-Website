// Pure SQL plan generator. Never connects to D1 or executes/deletes anything.
const list=(values,pattern)=>{
 if(!Array.isArray(values)||values.length>20||values.some(x=>typeof x!=='string'||!pattern.test(x)))throw Error('Invalid scoped cleanup identifiers');
 return [...new Set(values)].map(x=>"'"+x+"'").join(',');
};
export function testCleanupPlan(input){
 if(input?.authorised!==true||input.mailStoppedConfirmed!==true||input.providerReconciled!==true)throw Error('Explicit cleanup, stopped sends and provider reconciliation required');
 const samples=list(input.samples||[],/^samples:[a-zA-Z0-9_-]{1,140}$/),careers=list(input.careers||[],/^careers:[a-f0-9]{64}$/),newsletter=list(input.newsletter||[],/^[a-f0-9-]{36}$/i),observations=list(input.observations||[],/^[a-f0-9-]{36}$/i);
 const plan={FORMS_DB:[],CAREERS_DB:[],retainedNewsletterEvidence:input.newsletterDecision!=='erase-after-reviewed-rights'};
 for(const [name,ids] of [['FORMS_DB',samples],['CAREERS_DB',careers]]){
  if(!ids)continue;
  if(name==='FORMS_DB')plan[name].push('DELETE FROM registration_submission_claims WHERE registration_id IN ('+ids+');');
  for(const table of ['registration_audit_seals','registration_consent_events','registration_mail'])plan[name].push('DELETE FROM '+table+' WHERE registration_id IN ('+ids+');');
  plan[name].push('DELETE FROM registrations WHERE id IN ('+ids+');');
 }
 if((newsletter||observations)&&!plan.retainedNewsletterEvidence){
  const conditions=[];if(newsletter)conditions.push('request_id IN ('+newsletter+')','subject_hash IN (SELECT subject_hash FROM newsletter_consent_requests WHERE request_id IN ('+newsletter+'))');if(observations)conditions.push('id IN ('+observations+')');
  plan.FORMS_DB.push('DELETE FROM newsletter_observations WHERE '+conditions.join(' OR ')+';');
  if(newsletter)for(const table of ['newsletter_http_receipts','newsletter_html_deliveries','newsletter_consent_requests'])plan.FORMS_DB.push('DELETE FROM '+table+' WHERE request_id IN ('+newsletter+');');
 }
 return plan;
}
