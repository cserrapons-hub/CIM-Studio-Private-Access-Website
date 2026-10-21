import {handleRegistration} from '../../../server/registrations.js';
import {resolveRegistrationTestPolicy} from '../../../server/registration-test-policy.js';
export const onRequest=({request,env})=>handleRegistration(request,env,'careers',fetch,new Date(),resolveRegistrationTestPolicy(env,'careers'));
