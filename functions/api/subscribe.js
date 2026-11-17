import {handlePublicNewsletter} from '../../server/newsletter-public.js';
import {recordReferralSignup} from '../../server/referrals.js';
// The original newsletter flow is authoritative. Referral bookkeeping never changes its response.
export const onRequest=async ({request,env})=>{
 if(!request)return new Response(JSON.stringify({error:'unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method!=='POST')return handlePublicNewsletter(request,env);
 let referralCode=null,requestId=null,email=null;
 try{const body=await request.clone().json();if(typeof body.referralCode==='string'&&/^[a-f0-9]{24}$/.test(body.referralCode)&&body.subscriberType==='profesional'){referralCode=body.referralCode;requestId=body.requestId;email=body.email}}catch{}
 const result=await handlePublicNewsletter(request,env);
 if(result.status===202&&referralCode&&typeof email==='string'&&typeof requestId==='string'){
  try{const outcome=await result.clone().json();if(outcome.ok===true&&outcome.subscription==='confirmation_required')await recordReferralSignup(env,{email,referralCode,requestId})}catch{/* Newsletter acceptance must never be reversed by referral storage failure. */}
 }
 return result;
};
