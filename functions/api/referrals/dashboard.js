import {handleReferralDashboard} from '../../../server/referrals.js';
export const onRequestGet=({request,env})=>handleReferralDashboard(request,env);
