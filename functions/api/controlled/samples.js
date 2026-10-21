import {handleRegistration} from '../../../server/registrations.js';
import {resolveRegistrationTestPolicy} from '../../../server/registration-test-policy.js';
export const onRequest=({request,env})=>handleRegistration(request,env,'samples',fetch,new Date(),resolveRegistrationTestPolicy(env,'samples'));
