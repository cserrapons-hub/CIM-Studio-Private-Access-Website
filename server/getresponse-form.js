import {newsletterPublicReady} from './newsletter-release.js';
// Endpoint/three-field HTML mapping and Cloudflare relay are support-confirmed.
// Historical generic adapter below is kept for regression; current concrete relay is in getresponse-controlled.js.
export const GETRESPONSE_HTML_ENDPOINT='https://app.getresponse.com/add_subscriber.html';
// This UUID identifies the native Web Connect widget, not a standalone HTML export.
// Never derive an action URL, campaign token or consent field ID from it.
export const GETRESPONSE_FORM_ID='9748c724-790b-4c48-bbde-29366c400934';
// Confirmed by the owner in the account UI, not discovered or verified by API.
// These are reference facts, NEVER inferred HTML field names or a v3 campaign ID.
export const GETRESPONSE_LIST=Object.freeze({
 name:'cim_studio_newsletter',
 token:'PL6jh',
 panelId:'374914302',
 webDoubleOptInReported:true,
 apiDoubleOptInReported:true,
 plainHtmlAllowedReported:true,
 subscriptionNotifications:'admin@cimstudio.es',
 confirmationPage:'provider-default'
});
export const htmlFormReview=Object.freeze({
 complete:false,
 reason:'real_response_and_consent_flow_required'
});

// Preparation only: this produces a submission description, never a network request.
// Every provider field/value must be transcribed from the reviewed official export.
// This is intentionally not wired to the browser or a configurable live endpoint.
export function prepareOfficialHtmlSubmission(review,input){
 const blocked=()=>{throw new Error('official_html_contract_not_verified');};
 if(!review||review.exportReviewed!==true||review.listName!==GETRESPONSE_LIST.name||
    review.listToken!==GETRESPONSE_LIST.token||review.panelListId!==GETRESPONSE_LIST.panelId||
    review.listBindingVerified!==true||review.doubleOptInVerified!==true||
    review.nativeConsentVerified!==true||review.abuseProtectionVerified!==true||
    review.noAdditionalScriptsVerified!==true||review.method!=='POST') blocked();
 let action;
 try{action=new URL(review.action);}catch{blocked();}
 if(action.protocol!=='https:'||action.username||action.password||action.search||action.hash||
    !Array.isArray(review.reviewedOrigins)||!review.reviewedOrigins.includes(action.origin)) blocked();
 const fieldName=value=>typeof value==='string'&&value.length>0&&value.length<=200&&!/[\u0000-\u001f\u007f]/.test(value);
 if(!fieldName(review.emailField)||!fieldName(review.consentField)||
    review.emailField===review.consentField||typeof review.consentValue!=='string'||!review.consentValue||
    !Array.isArray(review.hiddenFields)) blocked();
 if(input?.consent!==true) throw new Error('consent_required');
 const email=typeof input.email==='string'?input.email.trim():'';
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_email');
 const names=new Set([review.emailField,review.consentField]);
 const fields=[[review.emailField,email],[review.consentField,review.consentValue]];
 for(const field of review.hiddenFields){
  if(!Array.isArray(field)||field.length!==2||!fieldName(field[0])||typeof field[1]!=='string'||names.has(field[0])) blocked();
  names.add(field[0]);fields.push([field[0],field[1]]);
 }
 return {method:'POST',action:action.href,fields};
}
export function htmlFormReady(env={},approved=false){
 // Still false with the current code-owned release contract. No env-only bypass.
 return newsletterPublicReady(env,approved);
}

// Pure request preparation only; no fetch and no connection to /api/subscribe.
// A server proxy is not assumed equivalent to a provider-rendered consent form.
export function prepareCloudflareHtmlRequest(review,input){
 if(review?.serverSubmissionVerified!==true||review?.serverConsentEvidenceVerified!==true||
    review?.providerAbuseControlsVerified!==true||review?.responseContractVerified!==true||
    review?.enctype!=='application/x-www-form-urlencoded'||review?.action!==GETRESPONSE_HTML_ENDPOINT)
  throw new Error('cloudflare_submission_not_verified');
 const prepared=prepareOfficialHtmlSubmission(review,input);
 return {url:prepared.action,options:{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(prepared.fields).toString()}};
}
