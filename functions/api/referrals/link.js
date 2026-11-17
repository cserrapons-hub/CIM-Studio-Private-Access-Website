import {handleReferralLink} from '../../../server/referrals.js';
export const onRequestPost=({request,env})=>handleReferralLink(request,env);
