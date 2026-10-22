import {handlePublicNewsletter} from '../../server/newsletter-public.js';
// Fail closed unless the approved legal policy, API response contract and runtime gates are ready.
export const onRequest=({request,env})=>request?handlePublicNewsletter(request,env):new Response(JSON.stringify({error:'unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
