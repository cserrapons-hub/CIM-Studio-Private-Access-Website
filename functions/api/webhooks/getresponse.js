import {handleGetResponseWebhook} from '../../../server/getresponse-webhook.js';
export const onRequest=({request,env})=>handleGetResponseWebhook(request,env);
