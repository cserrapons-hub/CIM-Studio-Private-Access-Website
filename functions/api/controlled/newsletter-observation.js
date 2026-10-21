import {observeNewsletter} from '../../../server/newsletter-observations.js';
export const onRequest=({request,env})=>observeNewsletter(request,env);
