import {withdrawCareerConsent} from '../../../server/registrations.js';
export const onRequest=({request,env})=>withdrawCareerConsent(request,env);
