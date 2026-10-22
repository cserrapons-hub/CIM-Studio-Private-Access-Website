import {segmentationReady} from './newsletter-segmentation.js';
// Code-owned API response contract: express owner-reported private validation on 2026-10-22.
// API acceptance is not DOI confirmation or Founders eligibility; runtime gates remain required.
export const newsletterRelease=Object.freeze({
 approved:true,
 version:'getresponse-public-api-v3-2026-10-22-v1',
 provider:'getresponse-api-v3',
 acceptedResponse:Object.freeze({status:202}),
 evidence:Object.freeze({date:'2026-10-22',source:'owner-reported-authorised-private-test',scope:'API acceptance, completed double opt-in and tipo_suscriptor=profesional (njdbT6); no automatic Founders grant',acceptanceBasis:'API v3 202 contract and previous recorded accepted private API delivery'})
});
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
