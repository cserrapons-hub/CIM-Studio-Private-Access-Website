import {drainOutbox} from '../server/production-outbox.js';
export default {
  async scheduled(controller,env,ctx) {
    if (env.CIM_PRODUCTION_DELIVERY_ENABLED !== 'true') return;
    ctx.waitUntil(drainOutbox(env).then(result=>{
      // Aggregate operational alert only: never log contacts, event bodies or secrets.
      if (result.reconciliation) console.warn('CIM outbox requires reconciliation',result.reconciliation);
    }));
  }
};
