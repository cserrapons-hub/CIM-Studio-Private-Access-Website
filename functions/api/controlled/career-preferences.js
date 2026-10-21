import {withdrawCareerConsent} from '../../../server/registrations.js';
import {resolveRegistrationTestPolicy} from '../../../server/registration-test-policy.js';
export const onRequest=({request,env})=>withdrawCareerConsent(request,env,new Date(),resolveRegistrationTestPolicy(env,'careers'));
