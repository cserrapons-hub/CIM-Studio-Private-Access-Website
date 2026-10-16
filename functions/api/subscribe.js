import { handleSubmission } from '../../server/forms.js';
export const onRequest=({request,env})=>handleSubmission(request,env,'subscribe');
