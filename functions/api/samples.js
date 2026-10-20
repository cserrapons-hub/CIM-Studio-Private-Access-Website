import {handleRegistration} from '../../server/registrations.js';
export const onRequest=({request,env})=>handleRegistration(request,env,'samples');
