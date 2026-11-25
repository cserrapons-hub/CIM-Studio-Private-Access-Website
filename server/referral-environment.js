export const ORIGIN='https://cimstudio.es';
export const CAMPAIGN='PL6jh';
const TEST_CAMPAIGN_NAME='cim_studio_referral_test';

export function referralTest(env){
 if(env.REFERRALS_TEST_MODE!=='true'||env.CONTROLLED_TEST_MODE!=='true'||env.SITE_LIVE==='true')return null;
 const origin=env.CONTROLLED_TEST_ORIGIN,campaign=env.GETRESPONSE_CAMPAIGN_ID;
 if(typeof origin!=='string'||!/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin)||
  env.NEWSLETTER_ORIGIN!==origin||env.CAJITA_TEST_ORIGIN!==origin||
  !/^[a-zA-Z0-9_-]+$/.test(campaign||'')||campaign===CAMPAIGN||
  !env.CONTROLLED_TEST_USER||!(env.CONTROLLED_TEST_PASSWORD?.length>=32))return null;
 const emails=new Set((env.REFERRALS_TEST_EMAILS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean));
 if(emails.size<2||emails.size>10)return null;
 return {origin,campaign,campaignName:TEST_CAMPAIGN_NAME,emails};
}
