import {handleStripeWebhook} from '../../../server/cajita.js';

export const onRequest=({request,env})=>handleStripeWebhook(request,env);
