import {referralTest} from './referral-environment.js';

const SITE_KEY='1x00000000000000000000AA';
const SECRET_KEY='1x0000000000000000000000000000000AA';
const DUMMY_TOKEN='XXXX.DUMMY.TOKEN.XXXX';

export function referralTurnstileTest(env,origin){
 return env.REFERRALS_TURNSTILE_TEST==='true'&&origin==='https://cim-referrals-test.pages.dev'&&
  referralTest(env)?.origin===origin?{siteKey:SITE_KEY,secretKey:SECRET_KEY}:null;
}

export function validReferralTurnstileProof(proof,{test,token,hostname,action}){
 if(proof?.success!==true)return false;
 if(test)return token===DUMMY_TOKEN&&proof.hostname==='example.com'&&proof.action===undefined;
 return proof.hostname===hostname&&proof.action===action;
}
