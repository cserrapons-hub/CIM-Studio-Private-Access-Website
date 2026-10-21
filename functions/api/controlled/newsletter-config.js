import {newsletterTestBoundary} from '../../../server/newsletter-test-boundary.js';
import {resolveNewsletterTestPolicy} from '../../../server/newsletter-test-policy.js';
import {controlledNewsletterReady} from '../../../server/getresponse-controlled-handler.js';
import {json} from '../../../server/forms.js';
export async function newsletterTestConfiguration(request,env,policy=resolveNewsletterTestPolicy(env)){
 if(request.method!=='GET')return json({error:'method'},405,{Allow:'GET'});
 const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
 const enabled=controlledNewsletterReady(env,policy);
 return json({testOnly:true,enabled,observationsEnabled:policy.approved&&env.NEWSLETTER_OBSERVATIONS_ENABLED==='true'&&Boolean(env.GETRESPONSE_API_KEY)&&Boolean(env.GETRESPONSE_CAMPAIGN_ID),siteKey:enabled?env.TURNSTILE_SITE_KEY:null,policy:{approved:policy.approved,version:policy.approved?policy.version:null,revision:policy.revision,es:policy.es,en:policy.en}},200,{'X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'});
}
export const onRequest=({request,env})=>newsletterTestConfiguration(request,env);
