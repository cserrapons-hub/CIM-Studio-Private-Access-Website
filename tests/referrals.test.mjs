import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleReferralLink,handleReferralDashboard,recordReferralSignup,reconcileReferrals} from '../server/referrals.js';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {cajitaPrice,handleCajita,handleStripeWebhook} from '../server/cajita.js';
import {fixture,policy} from './helpers/launch-fixture.mjs';
import {controlledTestBoundary} from '../server/controlled-test.js';
import {publicSettings} from '../server/settings.js';
const page=readFileSync(new URL('../recomienda/index.html',import.meta.url),'utf8');
const client=readFileSync(new URL('../recomienda/recomienda.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../referrals-migration.sql',import.meta.url),'utf8');
test('Cajita price changes at midnight in Mallorca',()=>{
 assert.equal(cajitaPrice(Date.parse('2026-12-31T22:59:59.999Z')),4000);
 assert.equal(cajitaPrice(Date.parse('2026-12-31T23:00:00.000Z')),6000);
});
test('referral landing includes a personal link request and dashboard',()=>{assert.match(page,/id="referral-form"/);assert.match(page,/id="dashboard"/);assert.match(page,/id="signup-form"/);assert.match(page,/id="video-frame"/)});
test('attribution accepts a personal link or the referrer email',()=>{assert.match(client,/referralCode/);assert.match(client,/referrerEmail/);assert.match(client,/\/api\/subscribe/);assert.match(client,/\/api\/referrals\/link/);assert.match(client,/\/api\/referrals\/dashboard/)});
test('D1 schema separates pending signups and unused coupons',()=>{assert.match(migration,/referral_signups/);assert.match(migration,/referral_coupons/);assert.match(migration,/redeemed_at/);assert.match(migration,/UNIQUE\(source_subject_hash,kind\)/)});
test('disabled referral service fails closed',async()=>{const req=new Request('https://cimstudio.es/api/referrals/link',{method:'POST'});const result=await handleReferralLink(req,{});assert.equal(result.status,503);const dashboard=await handleReferralDashboard(new Request('https://cimstudio.es/api/referrals/dashboard'),{});assert.equal(dashboard.status,503);await recordReferralSignup({}, {email:'person@example.com',referralCode:'a'.repeat(24),requestId:'test'})});

for(const preview of [false,true]){
test('referral, newsletter acceptance, DOI, email, test payment and coupon settlement ('+(preview?'private preview':'canonical signup')+')',async t=>{
 const s=await fixture();
 t.after(()=>s.close());
 s.forms.sqlite.exec(migration);
 const rows=table=>s.forms.sqlite.prepare('SELECT * FROM '+table).all();
 const origin=preview?'https://cim-referrals-test.pages.dev':'https://cimstudio.es';
 const shop=preview?origin:'https://checkout.example.test';
 const owner='owner@example.test',referred='professional@example.test',other='another@example.test';
 const campaign=preview?'preview-list':'PL6jh';
 const env=Object.assign(s.env,{
  REFERRALS_ENABLED:'true',REFERRALS_AUTOMATION_ENABLED:'true',NEWSLETTER_ENABLED:'true',
  NEWSLETTER_PUBLIC_ENABLED:'true',NEWSLETTER_PROVIDER:'getresponse-api-v3',
  NEWSLETTER_EVIDENCE_REVIEWED:'true',NEWSLETTER_VERIFIED:'true',NEWSLETTER_ORIGIN:origin,GETRESPONSE_CAMPAIGN_ID:campaign,
  CAJITA_TEST_ENABLED:'true',CAJITA_TEST_ORIGIN:shop,STRIPE_SECRET_KEY:'sk_test_simulated',
  STRIPE_WEBHOOK_SECRET:'whsec_simulated',
 });
 if(preview)Object.assign(env,{REFERRALS_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:origin,
  REFERRALS_TEST_EMAILS:[owner,referred,other].join(',')});
 const post=(base,path,data)=>new Request(base+path,{
  method:'POST',headers:{Origin:base,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},
  body:JSON.stringify(data),
 });
 const mail=[],sessions=new Map(),confirmed=new Set(),stripeCalls=[];
 const fetcher=async(url,options)=>{
  if(url.includes('siteverify'))return Response.json({success:true,hostname:new URL(origin).hostname,action:options.body.get('response')});
  if(url.includes('/campaigns/'))return Response.json({campaignId:campaign,name:preview?'cim_studio_referral_test':'cim_studio_newsletter',optinTypes:{api:'double'}});
  if(url.includes('/contacts?')){
   const email=new URL(url).searchParams.get('query[email]');
   return Response.json(confirmed.has(email)?[{
    email,campaign:{campaignId:campaign},createdOn:new Date().toISOString(),
    customFieldValues:[{customFieldId:env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID,value:['profesional']}],
   }]:[]);
  }
  if(url==='https://api.getresponse.com/v3/contacts'){
   assert.equal(JSON.parse(options.body).campaign.campaignId,campaign);
   return new Response(null,{status:202});
  }
  if(url==='https://api.resend.com/emails'){
   mail.push(JSON.parse(options.body));
   return Response.json({id:'simulation-'+mail.length});
  }
  assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
  stripeCalls.push(options.body);
  const orderId=options.body.get('metadata[order_id]');
  const id='cs_test_'+orderId;
  const session={id,livemode:false,url:'https://checkout.stripe.com/c/pay/'+id,metadata:{order_id:orderId}};
  const total=Number(options.body.get('line_items[0][price_data][unit_amount]'))+
   Number(options.body.get('line_items[1][price_data][unit_amount]'));
  sessions.set(orderId,{...session,amount_total:total,currency:'eur'});
  return Response.json(session);
 };
 t.mock.method(globalThis,'fetch',fetcher);
 if(preview){
  const protectedRequest=await controlledTestBoundary(new Request(origin+'/recomienda/'),env);
  assert.equal(protectedRequest.status,401);
  assert.equal(await controlledTestBoundary(post(origin,'/api/webhooks/stripe',{}),env),null);
  assert.equal(publicSettings(env,new URL(origin)).enabled.subscribe,true);
  assert.equal(publicSettings(env,new URL('https://cimstudio.es')).enabled.subscribe,false);
  const blocked=await handlePublicNewsletter(post(origin,'/api/subscribe',{...s.data,email:'excluded@example.test'}),env,{policy,fetcher,logger:()=>{}});
  assert.equal(blocked.status,403);
 }
 assert.equal((await handleReferralLink(post(origin,'/api/referrals/link',{email:owner,token:'referral'}),env)).status,202);
 const access=mail[0].text.match(/#acceso=([a-f0-9]{48})/)[1];
 const dashboard=()=>handleReferralDashboard(new Request(origin+'/api/referrals/dashboard',{headers:{'X-Referral-Access':access}}),env);
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

 const {price,shipping}=await (await handleCajita(new Request(shop+'/api/cajita/checkout'),env)).json();
 assert.equal(shipping,1540);
 const address={country:'ES',postal_code:'07420',name:'CIM Test',city:'Sa Pobla',line1:'Carrer de prova 1'};
 const start=(id,count=2,envOverride=env,delivery='pickup',extras={})=>handleCajita(post(shop,'/api/cajita/checkout',{
  id,count,delivery,access,total:price-500*count+(delivery==='shipping'?shipping:0),
  shipTo:delivery==='shipping'?address:undefined,...extras,
 }),envOverride);
 const first=crypto.randomUUID();
 assert.equal((await start(first,2,{...env,STRIPE_SECRET_KEY:'sk_live_simulated'})).status,503);
 const stalePrice=await start(first,2,env,'pickup',{total:1});
 assert.equal((await stalePrice.json()).error,'price_changed');
 assert.equal((await start(first,4)).status,400);
 for(const postal_code of ['35001','38001','51001','52001','00000','75001','7420','28A01']){
  const rejected=await start(crypto.randomUUID(),2,env,'shipping',{shipTo:{...address,postal_code}});
  assert.equal(rejected.status,422);
  assert.equal((await rejected.json()).error,'shipping_zone');
 }
 const foreign=await start(first,2,env,'shipping',{shipTo:{...address,country:'FR'}});
 assert.equal(foreign.status,422);
 assert.equal(stripeCalls.length,0);
 assert.equal(rows('cajita_orders').length,0);
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
 assert.equal(sessions.get(second).amount_total,price-1000+1540);
 const stripeShipping=stripeCalls.at(-1);
 assert.equal(stripeShipping.get('line_items[0][price_data][unit_amount]'),String(price-1000));
 assert.equal(stripeShipping.get('line_items[1][price_data][unit_amount]'),'1540');
 assert.equal(stripeShipping.get('payment_intent_data[shipping][address][postal_code]'),'07420');
 assert.equal(stripeShipping.get('payment_intent_data[shipping][address][country]'),'ES');
 assert.equal(stripeShipping.has('shipping_address_collection[allowed_countries][0]'),false);
 assert.equal((await webhook(second,'completed',{payment_status:'paid',amount_total:1})).status,409);
 for(let i=0;i<2;i++)assert.equal((await webhook(second,'completed',{payment_status:'paid'})).status,204);
 assert.equal(rows('referral_coupons').filter(coupon=>coupon.redeemed_at).length,2);
 assert.equal((await (await dashboard()).json()).availableCoupons,0);
});
}

test('Shipping eligibility accepts other Balearic islands and mainland provinces',async t=>{
 const s=await fixture();
 t.after(()=>s.close());
 s.forms.sqlite.exec(migration);
 const origin='https://checkout.example.test';
 Object.assign(s.env,{CAJITA_TEST_ENABLED:'true',CAJITA_TEST_ORIGIN:origin,STRIPE_SECRET_KEY:'sk_test_simulated',STRIPE_WEBHOOK_SECRET:'whsec_simulated'});
 t.mock.method(globalThis,'fetch',async(_url,{body})=>Response.json({
  livemode:false,id:'cs_test_'+body.get('metadata[order_id]'),url:'https://checkout.stripe.com/c/pay/simulation',
 }));
 for(const [postal_code,city] of [['07701','Maó'],['07800','Eivissa'],['28001','Madrid'],['50001','Zaragoza']]){
  const response=await handleCajita(new Request(origin+'/api/cajita/checkout',{
   method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},
   body:JSON.stringify({id:crypto.randomUUID(),count:0,total:cajitaPrice()+1540,delivery:'shipping',
    shipTo:{country:'ES',postal_code,city,name:'CIM Test',line1:'Calle de prueba 1'}}),
  }),s.env);
  assert.equal(response.status,200);
 }
});
