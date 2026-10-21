// Server-only. Never return provider bodies, authentication headers or emails to the browser/logs.
export const NEWSLETTER_NAME = 'cim_studio_newsletter';
const API = 'https://api.getresponse.com/v3';
// Sanitised reason codes only; never retain provider bodies, URLs or credentials.
export class NewsletterVerificationError extends Error {
  constructor(code,providerStatus=null){
    super('Newsletter configuration could not be verified');
    this.name='NewsletterVerificationError';this.code=code;
    this.providerStatus=Number.isInteger(providerStatus)&&providerStatus>=100&&providerStatus<=599?providerStatus:null;
  }
}
export async function readGetResponse(fetcher, key, path, operation='campaign') {
  const label=operation==='contacts'?'contacts':'campaign';
  let options;
  const url=API+path;
  try{
    options={method:'GET',headers:{'X-Auth-Token':'api-key '+key,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000)};
    // Validate URL/headers/options separately from transport. No network is performed.
    // Workers supports manual/follow, not redirect:error. Never follow API redirects.
    new Request(url,options);
  }catch{throw new NewsletterVerificationError(label+'_request');}
  let response;
  try{response=await fetcher(url,options);}
  catch(error){throw new NewsletterVerificationError(label+(options.signal.aborted||error?.name==='TimeoutError'||error?.name==='AbortError'?'_timeout':'_network'));}
  if(response.status>=300&&response.status<400){
    try{await response.body?.cancel();}catch{}
    throw new NewsletterVerificationError(label+'_redirect',response.status);
  }
  if (!response.ok) {
    try{await response.body?.cancel();}catch{}
    throw new NewsletterVerificationError(label+'_http',response.status);
  }
  try{return await response.json();}catch{throw new NewsletterVerificationError(label+'_response');}
}
export async function verifyNewsletter(key, campaignId, fetcher=fetch) {
  if (typeof key !== 'string' || !key.trim() || typeof campaignId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(campaignId))
    throw new NewsletterVerificationError('campaign_configuration');
  const campaign = await readGetResponse(fetcher,key,'/campaigns/' + encodeURIComponent(campaignId));
  // Official GetResponse SDK: CampaignOptinTypes and GetCampaignFields (optinTypes.api).
  // Keep exact identity and double-opt-in checks; never guess or relax them.
  if (!campaign||Array.isArray(campaign)||typeof campaign!=='object')throw new NewsletterVerificationError('campaign_response');
  if (campaign.campaignId !== campaignId || campaign.name !== NEWSLETTER_NAME)
    throw new NewsletterVerificationError('campaign_identity');
  if(campaign.optinTypes?.api !== 'double')throw new NewsletterVerificationError('campaign_optin');
  return {campaignId, name:NEWSLETTER_NAME, apiOptin:'double'};
}
export async function discoverNewsletter(key, fetcher=fetch) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('GETRESPONSE_API_KEY is required');
  const matches = new Map();
  for (let page=1;page<=10;page++) {
    const query = new URLSearchParams({'query[name]':NEWSLETTER_NAME,perPage:'100',page:String(page)});
    const campaigns = await readGetResponse(fetcher,key,'/campaigns?' + query);
    if (!Array.isArray(campaigns)) throw new Error('Unexpected campaign response');
    for (const campaign of campaigns) if (campaign.name === NEWSLETTER_NAME) matches.set(campaign.campaignId,campaign);
    if (campaigns.length < 100) {
      if (matches.size !== 1) throw new Error('Exactly one matching newsletter list is required');
      return verifyNewsletter(key,[...matches.keys()][0],fetcher);
    }
  }
  throw new Error('Campaign pagination limit reached; no list selected');
}
