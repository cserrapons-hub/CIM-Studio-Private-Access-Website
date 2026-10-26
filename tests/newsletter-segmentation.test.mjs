import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNewsletterApi} from '../server/getresponse-api-submission.js';
import {subscriberType,segmentationReady} from '../server/newsletter-segmentation.js';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {handleControlledNewsletter} from '../server/getresponse-controlled-handler.js';

test('audience is mandatory and uses an independently configured real field ID, never the consent ID',()=>{
 for(const type of [undefined,'','professional','other',true,{},['particular']])assert.throws(()=>subscriberType(type));
 for(const id of [undefined,'','njH9fM',' id with space '])assert.equal(segmentationReady({GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:id}),false);
 const env={GETRESPONSE_CAMPAIGN_ID:'PL6jh',GETRESPONSE_API_KEY:'simulation-key',GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:'simulation-type'};
 for(const type of ['particular','profesional']){
  const prepared=prepareNewsletterApi(env,'person@example.test',type),body=JSON.parse(prepared.options.body);
  assert.equal(prepared.url,'https://api.getresponse.com/v3/contacts');assert.deepEqual(body.campaign,{campaignId:'PL6jh'});
  assert.equal(Object.hasOwn(body,'dayOfCycle'),false);
  assert.deepEqual(body.customFieldValues,[{customFieldId:'njH9fM',value:['aceptado']},{customFieldId:'simulation-type',value:[type]}]);
  assert.ok(!Object.keys(body).some(key=>/confirmed|founder|autoresponder/i.test(key)));
 }
 assert.throws(()=>prepareNewsletterApi({...env,GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:''},'person@example.test','particular'));
});
test('missing/invalid audience or missing real field ID blocks before persistence and all provider calls',async()=>{
 for(const change of [{subscriberType:undefined},{subscriberType:''},{subscriberType:'invented'},{missingField:true}]){
  const s=await fixture();try{
   Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_API_REVIEWED:'true',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true'});
   if(change.missingField)delete s.env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID;
   const response=await handleControlledNewsletter(s.request('/api/controlled/subscribe',{...s.data,...change}),s.env,{policy,fetcher:()=>{throw Error('No provider call permitted');}});
   assert.equal(response.status,change.missingField?503:400);assert.equal((await response.json()).submission,'not_submitted');
   assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM newsletter_consent_requests').get().n,0);
  }finally{s.close();}
 }
});
test('private and public forms have an empty required audience selector, with both ES/EN labels',()=>{
 for(const file of ['index.html','controlled/newsletter/index.html']){
  const html=readFileSync(file,'utf8'),select=html.match(/<select[^>]*name="subscriberType"[^>]*>([\s\S]*?)<\/select>/)[0];
  assert.match(select,/required/);assert.match(select,/<option value="" disabled selected/);
  for(const value of ['particular','profesional']){assert.match(select,new RegExp('value="'+value+'"'));assert.ok(!new RegExp('value="'+value+'"[^>]*selected').test(select));}
 }
 for(const file of ['script.js','controlled/newsletter/test.js'])assert.match(readFileSync(file,'utf8'),/Private individual/);
});

test('normal professional signup sends classification and consent together, without a Cloudflare welcome or DOI grant',async()=>{
 const s=await fixture();try{
  Object.assign(s.env,{GETRESPONSE_CAMPAIGN_ID:'PL6jh',NEWSLETTER_API_REVIEWED:'true',NEWSLETTER_PREPARATION_ENABLED:'true',NEWSLETTER_CONTROLLED_SEND_ENABLED:'true'});let posts=0;
  const fetcher=async(url,options)=>{
   if(url.includes('siteverify'))return s.fetcher(url,options);
   if(url.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
   if(url.includes('/contacts?'))return Response.json([]);
   assert.equal(url,'https://api.getresponse.com/v3/contacts');assert.equal(options.method,'POST');posts++;
   assert.deepEqual(JSON.parse(options.body).customFieldValues,[{customFieldId:'njH9fM',value:['aceptado']},{customFieldId:s.env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID,value:['profesional']}]);
   return new Response(null,{status:202});
  };
  const input={...s.data,subscriberType:'profesional'};
  const body=await(await handleControlledNewsletter(s.request('/api/controlled/subscribe',input),s.env,{policy,fetcher})).json();
  assert.equal(body.delivery,'accepted');assert.equal(body.confirmationVerified,false);assert.equal(body.founders,'pending');assert.equal(posts,1);
  await handleControlledNewsletter(s.request('/api/controlled/subscribe',{...input,subscriberType:'particular',requestId:crypto.randomUUID()}),s.env,{policy,fetcher});assert.equal(posts,1,'Changing audience must not bypass existing-email deduplication');
 }finally{s.close();}
});
