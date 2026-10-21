import {controlledReview} from '../../../server/controlled-review.js';
export const onRequest=({request,env})=>controlledReview(request,env);
