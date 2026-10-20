import {handleControlledNewsletter} from '../../../server/getresponse-controlled-handler.js';
// Explicitly isolated test route; the public /api/subscribe stays disabled.
export const onRequest=({request,env})=>handleControlledNewsletter(request,env);
