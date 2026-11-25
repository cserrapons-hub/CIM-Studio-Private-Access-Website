import {handlePublicNewsletter} from '../../server/newsletter-public.js';

export const onRequest=({request,env})=>handlePublicNewsletter(request,env);
