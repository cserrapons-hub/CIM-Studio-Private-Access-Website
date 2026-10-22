import {segmentationReady} from './newsletter-segmentation.js';
// Code-owned release gate. Populate only from an authorised real test/provider contract.
// No success URL/status is guessed; environment flags cannot approve this object.
export const newsletterRelease=Object.freeze({approved:false,version:'',provider:'getresponse-api-v3',acceptedResponse:null});
export function validRelease(profile){
 if(profile?.approved!==true||typeof profile.version!=='string'||!profile.version.trim()||!profile.acceptedResponse)return false;
 return profile.provider==='getresponse-api-v3'&&profile.acceptedResponse.status===202;
}
export function newsletterBuildReady(env,approved,profile=newsletterRelease){
 if(!approved||!validRelease(profile)||env.FORMS_ENABLED!=='true'||env.NEWSLETTER_ENABLED!=='true'||env.NEWSLETTER_PUBLIC_ENABLED!=='true'||env.NEWSLETTER_PROVIDER!=='getresponse-api-v3'||env.NEWSLETTER_EVIDENCE_REVIEWED!=='true'||env.NEWSLETTER_VERIFIED!=='true')return false;
 return env.GETRESPONSE_CAMPAIGN_ID==='PL6jh'&&env.NEWSLETTER_ORIGIN==='https://cimstudio.es';
}
export function newsletterPublicReady(env,approved,profile=newsletterRelease){
 if(!newsletterBuildReady(env,approved,profile)||!segmentationReady(env)||!env.FORMS_DB)return false;
 if(!['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','NEWSLETTER_DATA_KEY','GETRESPONSE_API_KEY'].every(k=>typeof env[k]==='string'&&env[k].trim())||env.AUDIT_HASH_SECRET.length<32)return false;
 try{return atob(env.NEWSLETTER_DATA_KEY).length===32;}catch{return false;}
}

export function acceptedNewsletterResponse(response,profile=newsletterRelease){
 return validRelease(profile)&&response.status===profile.acceptedResponse.status;
}
