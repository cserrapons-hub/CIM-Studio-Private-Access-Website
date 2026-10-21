import {registrationReady} from './registration-settings.js';
import {resolveRegistrationTestPolicy,fictionalSample} from './registration-test-policy.js';
import {authorisedNewsletterTestEmail,validNewsletterAllowlistSecret} from './newsletter-test-allowlist.js';
import {newsletterTestBoundary} from './newsletter-test-boundary.js';
import {Rejection} from './forms.js';
export function registrationTestReady(env,kind,policy=resolveRegistrationTestPolicy(env,kind)){
 return policy.kind===kind&&policy.approved===true&&env[(kind==='samples'?'SAMPLES':'CAREERS')+'_TEST_LEGAL_APPROVED']==='true'&&env.CONTROLLED_TEST_MODE==='true'&&env.SITE_LIVE!=='true'&&env.CONTROLLED_TEST_ORIGIN==='https://cim-studio-test.pages.dev'&&env.REGISTRATION_ORIGIN===env.CONTROLLED_TEST_ORIGIN&&env.REGISTRATIONS_TEST_ENABLED==='true'&&validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET)&&env.NEWSLETTER_TEST_ALLOWLIST_SECRET!==env.AUDIT_HASH_SECRET&&/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH||'')&&registrationReady(env,kind,true);
}
export async function registrationTestBoundary(request,env,kind,policy){
 const blocked=await newsletterTestBoundary(request,env);if(blocked)return blocked;
 if(!registrationTestReady(env,kind,policy))throw new Rejection('unavailable',503);
 if(!new URL(request.url).pathname.startsWith('/api/controlled/'))throw new Rejection('unavailable',503);
 return null;
}
export async function validateRegistrationTestData(raw,data,env,kind){
 if(raw.testData!==true)throw new Rejection('consent');
 if(!await authorisedNewsletterTestEmail(env,data.email))throw new Rejection('unavailable',503);
 if(kind==='samples'&&Object.entries(fictionalSample).some(([key,value])=>data[key]!==value))throw new Rejection('invalid');
}
