import {newsletterTestBoundary} from '../../../server/newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from '../../../server/newsletter-test-policy.js';
import {observationConfigurationIssue} from '../../../server/newsletter-observations.js';
import {controlledNewsletterReady} from '../../../server/getresponse-controlled-handler.js';
import {retryUiRequestId} from '../../../server/newsletter-html404-retry.js';
import {json} from '../../../server/forms.js';
export async function newsletterTestConfiguration(request,env,policy=resolveNewsletterTestPolicy(env)){
 if(request.method!=='GET')return json({error:'method'},405,{Allow:'GET'});
 const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
 let enabled=controlledNewsletterReady(env,policy),retryRequestId=null;
 if(enabled&&env.NEWSLETTER_HTML404_RETRY_ENABLED==='true'){try{retryRequestId=await retryUiRequestId(env);enabled=Boolean(retryRequestId);}catch{enabled=false;}}
 return json({testOnly:true,enabled,...(enabled&&retryRequestId?{retryRequestId}:{}),observationsEnabled:observationConfigurationIssue(env,policy)===null,siteKey:enabled?env.TURNSTILE_SITE_KEY:null,policy:{approved:policy.approved,version:policy.approved?policy.version:null,revision:policy.revision,es:policy.es,en:policy.en}},200,{'X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'});
}
export const onRequest=({request,env})=>newsletterTestConfiguration(request,env);
