import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/launch-fixture.mjs';
import {handleRegistration} from '../server/registrations.js';
import legal from '../legal/content.js';
async function setup(kind='samples',receipt='accepted',admin='accepted'){
 const s=await fixture();s.env.CONTROLLED_TEST_MODE='false';let sends=0;
 const data={...(kind==='samples'?s.sample:s.data),legalVersion:legal.version};
 const request=()=>s.request('/api/'+kind,data);
 const fetcher=async(url,options)=>{
  if(url.includes('siteverify'))return Response.json({success:true,hostname:new URL(s.env.REGISTRATION_ORIGIN).hostname,action:kind});
  assert.equal(url,'https://api.resend.com/emails');sends++;
  const payload=JSON.parse(options.body),state=payload.to[0]==='admin@cimstudio.es'?admin:receipt;
  if(state==='uncertain')throw Error('simulated transport failure');
  if(state==='pending')return new Response(null,{status:429});
  if(state==='rejected')return new Response(null,{status:422});
  return Response.json({id:'simulation-'+sends});
 };
 return {...s,run:()=>handleRegistration(request(),s.env,kind,fetcher),sends:()=>sends};
}
test('sample receipt state is independent of the administrative notification, including replay without a new send',async()=>{
 for(const [receipt,admin] of [['accepted','accepted'],['accepted','rejected'],['accepted','uncertain'],['rejected','accepted'],['uncertain','accepted'],['pending','accepted']]){
  const s=await setup('samples',receipt,admin);try{
   const r=await s.run(),body=await r.json();assert.equal(r.status,202);assert.equal(body.recorded,true);assert.equal(body.receiptMailState,receipt);assert.equal(body.deliveryVerified,false);assert.equal(body.mail,receipt==='accepted'&&admin==='accepted'?'accepted':'pending');
   assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registration_mail').get().n,2);assert.equal(s.sends(),2);
   const replay=await s.run();assert.equal(replay.status,202);assert.equal((await replay.json()).receiptMailState,receipt);assert.equal(s.sends(),2);
   assert.ok(!JSON.stringify(body).includes(s.data.email));
  }finally{s.close();}
 }
});
test('failed sample persistence never produces a recorded response or sends email',async()=>{
 const s=await setup();try{s.env.FORMS_DB.batch=async()=>{throw Error('simulated database failure');};const response=await s.run();assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});assert.equal(s.sends(),0);assert.equal(s.forms.sqlite.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);}finally{s.close();}
});
test('career response contract does not acquire the sample-specific receipt field',async()=>{
 const s=await setup('careers');try{const response=await s.run();assert.equal(response.status,202);const body=await response.json();assert.equal(body.mail,'accepted');assert.equal(body.confirmationRequired,true);assert.equal(Object.hasOwn(body,'receiptMailState'),false);}finally{s.close();}
});
