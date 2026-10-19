// Server-only. Never return provider bodies, authentication headers or emails to the browser/logs.
export const NEWSLETTER_NAME = 'cim_studio_newsletter';
const API = 'https://api.getresponse.com/v3';
async function read(fetcher, key, path) {
  const response = await fetcher(API + path, {
    headers: {'X-Auth-Token':'api-key ' + key, Accept:'application/json'},
    redirect:'error', signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Newsletter configuration could not be verified');
  return response.json();
}
export async function verifyNewsletter(key, campaignId, fetcher=fetch) {
  if (typeof key !== 'string' || !key.trim() || typeof campaignId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(campaignId))
    throw new Error('Newsletter configuration missing');
  const campaign = await read(fetcher,key,'/campaigns/' + encodeURIComponent(campaignId));
  // Official GetResponse SDK: CampaignOptinTypes and GetCampaignFields (optinTypes.api).
  // Unknown/missing settings fail closed; never change the provider's configuration.
  if (campaign.campaignId !== campaignId || campaign.name !== NEWSLETTER_NAME || campaign.optinTypes?.api !== 'double')
    throw new Error('Newsletter name or API double opt-in could not be verified');
  return {campaignId, name:NEWSLETTER_NAME, apiOptin:'double'};
}
export async function discoverNewsletter(key, fetcher=fetch) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('GETRESPONSE_API_KEY is required');
  const matches = new Map();
  for (let page=1;page<=10;page++) {
    const query = new URLSearchParams({'query[name]':NEWSLETTER_NAME,perPage:'100',page:String(page)});
    const campaigns = await read(fetcher,key,'/campaigns?' + query);
    if (!Array.isArray(campaigns)) throw new Error('Unexpected campaign response');
    for (const campaign of campaigns) if (campaign.name === NEWSLETTER_NAME) matches.set(campaign.campaignId,campaign);
    if (campaigns.length < 100) {
      if (matches.size !== 1) throw new Error('Exactly one matching newsletter list is required');
      return verifyNewsletter(key,[...matches.keys()][0],fetcher);
    }
  }
  throw new Error('Campaign pagination limit reached; no list selected');
}
