// Code-owned release gate. Populate only from an authorised real test/provider contract.
// No success URL/status is guessed; environment flags cannot approve this object.
export const newsletterRelease=Object.freeze({approved:false,version:'',acceptedResponse:null});
export function validRelease(profile){
 if(profile?.approved!==true||typeof profile.version!=='string'||!profile.version.trim()||!profile.acceptedResponse)return false;
 const {status,location}=profile.acceptedResponse;
 if(![302,303].includes(status)||typeof location!=='string')return false;
 try{const url=new URL(location);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash;}catch{return false;}
}
export function newsletterPublicReady(env,approved,profile=newsletterRelease){
 if(!approved||!validRelease(profile)||env.FORMS_ENABLED!=='true'||env.NEWSLETTER_ENABLED!=='true'||env.NEWSLETTER_PUBLIC_ENABLED!=='true'||env.NEWSLETTER_PROVIDER!=='getresponse-html'||env.NEWSLETTER_EVIDENCE_REVIEWED!=='true'||env.NEWSLETTER_VERIFIED!=='true'||!env.FORMS_DB)return false;
 if(!['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','NEWSLETTER_DATA_KEY','NEWSLETTER_ORIGIN'].every(k=>typeof env[k]==='string'&&env[k].trim())||env.AUDIT_HASH_SECRET.length<32)return false;
 try{return new URL(env.NEWSLETTER_ORIGIN).origin==='https://cimstudio.es'&&env.NEWSLETTER_ORIGIN==='https://cimstudio.es'&&atob(env.NEWSLETTER_DATA_KEY).length===32;}catch{return false;}
}
export function acceptedNewsletterResponse(response,profile=newsletterRelease){
 return validRelease(profile)&&response.status===profile.acceptedResponse.status&&response.headers.get('Location')===profile.acceptedResponse.location;
}
