// Read-only: run in a trusted environment with GETRESPONSE_API_KEY securely injected.
// Does not create contacts, change settings or send emails. No public endpoint is added.
import {discoverNewsletter} from '../server/getresponse-newsletter.js';
try {
  const result=await discoverNewsletter(process.env.GETRESPONSE_API_KEY);
  if(process.env.GETRESPONSE_CAMPAIGN_ID && process.env.GETRESPONSE_CAMPAIGN_ID!==result.campaignId)
    throw new Error('Configured campaign does not match the discovered newsletter');
  console.log(JSON.stringify({GETRESPONSE_CAMPAIGN_ID:result.campaignId,name:result.name,apiOptin:result.apiOptin}));
} catch {
  console.error('Newsletter verification failed. Check the secret, exact list name and API double opt-in in GetResponse. No contacts were created.');
  process.exitCode=1;
}
