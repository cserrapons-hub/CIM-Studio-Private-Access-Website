// Server-only v3 contract. No request is sent by this builder.
import {subscriberType,segmentationReady} from './newsletter-segmentation.js';
import {NEWSLETTER_CONSENT} from './getresponse-controlled.js';
export const NEWSLETTER_API_CONTRACT='getresponse-api-v3-request-v1';
export function prepareNewsletterApi(env,email,type){
 if(!segmentationReady(env))throw Error('segmentation_configuration');
 type=subscriberType(type);
 if(env.GETRESPONSE_CAMPAIGN_ID!=='PL6jh'||typeof env.GETRESPONSE_API_KEY!=='string'||!env.GETRESPONSE_API_KEY.trim())throw Error('api_configuration');
 const options={method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',Accept:'application/json','X-Auth-Token':'api-key '+env.GETRESPONSE_API_KEY},body:JSON.stringify({email,campaign:{campaignId:'PL6jh'},customFieldValues:[{customFieldId:NEWSLETTER_CONSENT.customFieldId,value:[NEWSLETTER_CONSENT.value]},{customFieldId:env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID,value:[type]}]})};
 const url='https://api.getresponse.com/v3/contacts';new Request(url,options);return {url,options};
}
