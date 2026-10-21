import {handlePublicNewsletter} from '../../server/newsletter-public.js';
// Fail closed: current code-owned response contract and public legal policy are unapproved.
export const onRequest=({request,env})=>request?handlePublicNewsletter(request,env):new Response(JSON.stringify({error:'unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
