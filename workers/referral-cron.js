export default {
 async scheduled(_event,env){
  if(!(env.REFERRALS_CRON_SECRET?.length>=32))throw new Error('Missing production reconciliation secret');
  const response=await fetch('https://cimstudio.es/api/referrals/reconcile',{
   method:'POST',redirect:'manual',signal:AbortSignal.timeout(60000),
   headers:{Authorization:'Bearer '+env.REFERRALS_CRON_SECRET},
  });
  if(response.status!==204)throw new Error('Production reconciliation returned '+response.status);
 },
};
