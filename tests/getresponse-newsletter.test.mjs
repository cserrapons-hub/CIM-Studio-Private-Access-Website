import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverNewsletter,verifyNewsletter,NEWSLETTER_NAME} from '../server/getresponse-newsletter.js';
const detail={campaignId:'real-from-api',name:NEWSLETTER_NAME,optinTypes:{api:'double'}};
test('read-only discovery selects exact newsletter name and verifies its actual ID and API opt-in',async()=>{
 const calls=[];
 const result=await discoverNewsletter('simulation-only',async(url,options)=>{
  calls.push({url,options});
  return Response.json(url.includes('/campaigns?')?[{campaignId:'wrong',name:NEWSLETTER_NAME+'_other'},detail]:detail);
 });
 assert.deepEqual(result,{campaignId:detail.campaignId,name:NEWSLETTER_NAME,apiOptin:'double'});
 assert.equal(calls.length,2);
 assert.equal(new URL(calls[0].url).searchParams.get('query[name]'),NEWSLETTER_NAME);
 assert.equal(calls[1].url,'https://api.getresponse.com/v3/campaigns/real-from-api');
 for(const c of calls){assert.equal(c.options.method,'GET');assert.equal(c.options.body,undefined);assert.equal(c.options.redirect,'manual');assert.equal(c.options.headers['X-Auth-Token'],'api-key simulation-only');}
});
test('discovery refuses absent, ambiguous or malformed lists and handles pagination without silently choosing',async()=>{
 for(const response of [[],[detail,{...detail,campaignId:'second'}],{}])
  await assert.rejects(discoverNewsletter('simulation',async()=>Response.json(response)));
 let page=0;
 const result=await discoverNewsletter('simulation',async(url)=>{
  if(!url.includes('/campaigns?'))return Response.json(detail);
  page++;return Response.json(page===1?Array.from({length:100},(_,i)=>({campaignId:String(i),name:'other'})):[detail]);
 });
 assert.equal(page,2);assert.equal(result.campaignId,detail.campaignId);
});
test('provider authentication, network, JSON and missing API opt-in failures are closed',async()=>{
 for(const fetcher of [async()=>new Response(null,{status:401}),async()=>{throw Error('network');},async()=>new Response('not json'),async()=>Response.json({...detail,optinTypes:{webform:'double'}})])
  await assert.rejects(verifyNewsletter('simulation',detail.campaignId,fetcher));
 let called=false;
 await assert.rejects(verifyNewsletter('simulation','../contacts',async()=>{called=true;}));assert.equal(called,false);
 await assert.rejects(discoverNewsletter('',async()=>{called=true;}));assert.equal(called,false);
});
