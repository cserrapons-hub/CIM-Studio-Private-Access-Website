export default {
 async scheduled(_event,env){
  if(!env.REFERRALS_TEST_CRON_SECRET)throw new Error('Missing test reconciliation secret');
  const response=await fetch('https://cim-referrals-test.pages.dev/api/referrals/reconcile-test',{
   method:'POST',redirect:'manual',
   headers:{Authorization:'Bearer '+env.REFERRALS_TEST_CRON_SECRET},
  });
  if(response.status!==204)throw new Error('Test reconciliation returned '+response.status);
 },
};
