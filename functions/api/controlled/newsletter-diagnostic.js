import {newsletterDiagnostic} from '../../../server/newsletter-diagnostic.js';
export const onRequest=({request,env})=>newsletterDiagnostic(request,env);
