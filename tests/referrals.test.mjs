import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleReferralLink,handleReferralDashboard,recordReferralSignup,reconcileReferrals} from '../server/referrals.js';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {handleCajita,handleStripeWebhook} from '../server/cajita.js';
import {fixture,policy} from './helpers/launch-fixture.mjs';
const page=readFileSync(new URL('../recomienda/index.html',import.meta.url),'utf8');
const client=readFileSync(new URL('../recomienda/recomienda.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../referrals-migration.sql',import.meta.url),'utf8');
test('referral landing includes a personal link request and dashboard',()=>{assert.match(page,/id="referral-form"/);assert.match(page,/id="dashboard"/);assert.match(page,/id="signup-form"/);assert.match(page,/id="video-frame"/)});
test('attribution accepts a personal link or the referrer email',()=>{assert.match(client,/referralCode/);assert.match(client,/referrerEmail/);assert.match(client,/\/api\/subscribe/);assert.match(client,/\/api\/referrals\/link/);assert.match(client,/\/api\/referrals\/dashboard/)});
test('D1 schema separates pending signups and unused coupons',()=>{assert.match(migration,/referral_signups/);assert.match(migration,/referral_coupons/);assert.match(migration,/redeemed_at/);assert.match(migration,/UNIQUE\(source_subject_hash,kind\)/)});
test('disabled referral service fails closed',async()=>{const req=new Request('https://cimstudio.es/api/referrals/link',{method:'POST'});const result=await handleReferralLink(req,{});assert.equal(result.status,503);const dashboard=await handleReferralDashboard(new Request('https://cimstudio.es/api/referrals/dashboard'),{});assert.equal(dashboard.status,503);await recordReferralSignup({}, {email:'person@example.com',referralCode:'a'.repeat(24),requestId:'test'})});

test('referral, newsletter acceptance, DOI, email, test payment and coupon settlement',async t=>{
 const s=await fixture();
 t.after(()=>s.close());
 s.forms.sqlite.exec(migration);
 const rows=table=>s.forms.sqlite.prepare('SELECT * FROM '+table).all();
 const origin='https://cimstudio.es',shop='https://checkout.example.test';
 const owner='owner@example.test',referred='professional@example.test',other='another@example.test';
 const env=Object.assign(s.env,{
  REFERRALS_ENABLED:'true',REFERRALS_AUTOMATION_ENABLED:'true',NEWSLETTER_ENABLED:'true',
  NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',
  NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:origin,GETRESPONSE_CAMPAIGN_ID:'PL6jh',
  CAJITA_TEST_ENABLED:'true',CAJITA_TEST_ORIGIN:shop,STRIPE_SECRET_KEY:'sk_test_simulated',
  STRIPE_WEBHOOK_SECRET:'whsec_simulated',CAJITA_SHIPPING_ES_CENTS:'900',
 });
 const post=(base,path,data)=>new Request(base+path,{
  method:'POST',headers:{Origin:base,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},
  body:JSON.stringify(data),
 });
 const mail=[],sessions=new Map(),confirmed=new Set();
 const fetcher=async(url,options)=>{
  if(url.includes('siteverify'))return Response.json({success:true,hostname:'cimstudio.es',action:options.body.get('response')});
  if(url.includes('/campaigns/'))return Response.json({campaignId:'PL6jh',name:'cim_studio_newsletter',optinTypes:{api:'double'}});
  if(url.includes('/contacts?')){
   const email=new URL(url).searchParams.get('query[email]');
   return Response.json(confirmed.has(email)?[{
    email,campaign:{campaignId:'PL6jh'},createdOn:new Date().toISOString(),
    customFieldValues:[{customFieldId:env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID,value:['profesional']}],
   }]:[]);
  }
  if(url==='https://api.getresponse.com/v3/contacts')return new Response(null,{status:202});
  if(url==='https://api.resend.com/emails'){
   mail.push(JSON.parse(options.body));
   return Response.json({id:'simulation-'+mail.length});
  }
  assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
  const orderId=options.body.get('metadata[order_id]');
  const id='cs_test_'+orderId;
  const session={id,livemode:false,url:'https://checkout.stripe.com/c/pay/'+id,metadata:{order_id:orderId}};
  const total=Number(options.body.get('line_items[0][price_data][unit_amount]'))+
   Number(options.body.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'));
  sessions.set(orderId,{...session,amount_total:total,currency:'eur'});
  return Response.json(session);
 };
 t.mock.method(globalThis,'fetch',fetcher);
 assert.equal((await handleReferralLink(post(origin,'/api/referrals/link',{email:owner,token:'referral'}),env)).status,202);
 const access=mail[0].text.match(/#acceso=([a-f0-9]{48})/)[1];
 const dashboard=()=>handleReferralDashboard(new Request(origin+'/api/referrals/dashboard',{headers:{Authorization:'Bearer '+access}}),env);
 const {url}=await (await dashboard()).json();
 for(const [email,attribution] of [[referred,{referralCode:new URL(url).searchParams.get('r')}],[other,{referrerEmail:owner}]]){
  const signup=await handlePublicNewsletter(post(origin,'/api/subscribe',{
   ...s.data,email,subscriberType:'profesional',token:'subscribe',requestId:crypto.randomUUID(),...attribution,
  }),env,{policy,fetcher});
  assert.equal(signup.status,202);
 }
 await reconcileReferrals(env);
 assert.equal(rows('referral_coupons').length,0);
 assert.equal(mail.length,1);
 confirmed.add(referred);
 confirmed.add(other);
 s.forms.sqlite.exec('UPDATE referral_poll SET next_at=0');
 await reconcileReferrals(env);
 await reconcileReferrals(env);
 assert.equal(rows('referral_coupons').length,4);
 assert.equal(rows('referral_coupon_delivery').length,4);
 assert.equal(mail.length,5);
 assert.equal((await (await dashboard()).json()).availableCoupons,2);

 const start=(id,count=2,envOverride=env,delivery='pickup')=>handleCajita(post(shop,'/api/cajita/checkout',{id,count,delivery,access}),envOverride);
 const {price}=await (await handleCajita(new Request(shop+'/api/cajita/checkout'),env)).json();
 const first=crypto.randomUUID();
 assert.equal((await start(first,2,{...env,STRIPE_SECRET_KEY:'sk_live_simulated'})).status,503);
 assert.equal((await start(first)).status,200);
 assert.equal(sessions.get(first).amount_total,price-1000);
 assert.equal((await start(crypto.randomUUID(),1)).status,409);
 assert.equal((await start(first)).status,200);
 const webhook=(id,type,session,valid=true)=>{
  const raw=JSON.stringify({livemode:false,type:'checkout.session.'+type,data:{object:{...sessions.get(id),...session}}});
  const time=String(Math.floor(Date.now()/1000));
  const mac=createHmac('sha256',valid?env.STRIPE_WEBHOOK_SECRET:'wrong').update(time+'.'+raw).digest('hex');
  return handleStripeWebhook(new Request(shop+'/api/webhooks/stripe',{method:'POST',headers:{'Stripe-Signature':'t='+time+',v1='+mac},body:raw}),env);
 };
 assert.equal((await webhook(first,'expired',{status:'expired'},false)).status,400);
 assert.equal((await webhook(first,'expired',{status:'expired'})).status,204);
 assert.equal((await (await dashboard()).json()).availableCoupons,2);
 const second=crypto.randomUUID();
 assert.equal((await start(second,2,env,'shipping')).status,200);
 assert.equal(sessions.get(second).amount_total,price-1000+900);
 assert.equal((await webhook(second,'completed',{payment_status:'paid',amount_total:1})).status,409);
 for(let i=0;i<2;i++)assert.equal((await webhook(second,'completed',{payment_status:'paid'})).status,204);
 assert.equal(rows('referral_coupons').filter(coupon=>coupon.redeemed_at).length,2);
 assert.equal((await (await dashboard()).json()).availableCoupons,0);
});
