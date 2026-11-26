import {referralTest} from '../../../server/referral-environment.js';
import {reconcileReferrals} from '../../../server/referrals.js';

export async function onRequest({request,env}){
 const preview=referralTest(env);
 const secret=env.REFERRALS_TEST_CRON_SECRET;
 if(request.method!=='POST'||!preview||new URL(request.url).origin!==preview.origin||
  typeof secret!=='string'||secret.length<32||env.REFERRALS_AUTOMATION_ENABLED!=='true')
  return new Response(null,{status:404});
 const header=request.headers.get('Authorization')||'';
 if(header.length!==secret.length+7)return new Response(null,{status:403});
 const expected='Bearer '+secret;
 let difference=0;
 for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^header.charCodeAt(i);
 if(difference)return new Response(null,{status:403});
 await reconcileReferrals(env);
 return new Response(null,{status:204});
}
