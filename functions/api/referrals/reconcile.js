import {ORIGIN,CAMPAIGN} from '../../../server/referral-environment.js';
import {reconcileReferrals,referralAutomationReady} from '../../../server/referrals.js';

export async function onRequest({request,env}){
 const secret=env.REFERRALS_CRON_SECRET;
 if(request.method!=='POST'||new URL(request.url).origin!==ORIGIN||env.SITE_LIVE!=='true'||
  env.CONTROLLED_TEST_MODE==='true'||env.REFERRALS_TEST_MODE==='true'||env.NEWSLETTER_ORIGIN!==ORIGIN||
  env.GETRESPONSE_CAMPAIGN_ID!==CAMPAIGN||env.REFERRALS_ENABLED!=='true'||
  env.REFERRALS_AUTOMATION_ENABLED!=='true'||typeof secret!=='string'||secret.length<32)
  return new Response(null,{status:404});
 const supplied=request.headers.get('Authorization')||'';
 const expected='Bearer '+secret;
 if(supplied.length!==expected.length)return new Response(null,{status:403});
 let difference=0;
 for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^supplied.charCodeAt(i);
 if(difference)return new Response(null,{status:403});
 if(!referralAutomationReady(env))return new Response(null,{status:503});
 await reconcileReferrals(env);
 return new Response(null,{status:204});
}
