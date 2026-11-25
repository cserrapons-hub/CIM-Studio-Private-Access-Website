import {reconcileReferrals} from '../server/referrals.js';

export default {
  scheduled(_event, env, ctx) {
    ctx.waitUntil(reconcileReferrals(env));
  },
};
