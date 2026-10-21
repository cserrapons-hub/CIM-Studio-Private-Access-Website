import {newsletterTestBoundary} from '../../../server/newsletter-test-boundary.js';
import {resolveRegistrationTestPolicy,fictionalSample} from '../../../server/registration-test-policy.js';
import {registrationTestReady} from '../../../server/registration-test-scope.js';
import {json} from '../../../server/forms.js';
export async function registrationTestConfiguration(request,env,definitions={}){
 if(request.method!=='GET')return json({error:'method'},405,{Allow:'GET'});
 const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
 const policies={},enabled={};
 for(const kind of ['samples','careers']){const policy=resolveRegistrationTestPolicy(env,kind,definitions[kind]);policies[kind]=policy;enabled[kind]=registrationTestReady(env,kind,policy);}
 return json({testOnly:true,enabled,policies,fictionalSample,siteKey:Object.values(enabled).some(Boolean)?env.TURNSTILE_SITE_KEY:null},200,{'X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'});
}
export const onRequest=({request,env})=>registrationTestConfiguration(request,env);
