import {json,readJson,Rejection} from './forms.js';
import {ORIGIN,ownerForToken,throttle} from './referrals.js';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const cutoff=Date.parse('2027-01-01T00:00:00+01:00');
const price=()=>Date.now()<cutoff?4000:6000;
const shippingPrice=env=>/^[1-9][0-9]{0,5}$/.test(env.CAJITA_SHIPPING_ES_CENTS||'')?Number(env.CAJITA_SHIPPING_ES_CENTS):null;
const checkoutMode=(env,origin)=>{
 if(!env.FORMS_DB||!/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||'')||!(env.AUDIT_HASH_SECRET?.length>=32))return null;
 if(origin===ORIGIN){
  return env.CAJITA_LIVE_ENABLED==='true'&&env.CAJITA_LIVE_VERIFIED==='true'&&
   /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'')&&shippingPrice(env)!==null?'live':null;
 }
 return origin!=='https://www.cimstudio.es'&&origin===env.CAJITA_TEST_ORIGIN&&env.CAJITA_TEST_ENABLED==='true'&&
  /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY||'')?'test':null;
};

export async function handleCajita(request,env){
 try{
  const origin=new URL(request.url).origin;
  const mode=checkoutMode(env,origin);
  if(request.method==='GET')return json({available:mode!==null,test:mode==='test',price:price(),shipping:shippingPrice(env)});
  if(request.method!=='POST')return json({error:'method'},405);
  if(!mode)throw new Rejection('unavailable',503);
  const live=Number(mode==='live');
  if(request.headers.get('Origin')!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new Rejection('origin',403);
  await throttle(request,env,'checkout');
  const {id,count,delivery,access}=await readJson(request);
  if(typeof id!=='string'||!UUID.test(id)||!Number.isInteger(count)||count<0||count>3||!['pickup','shipping'].includes(delivery))
   throw new Rejection('invalid');
  const shipping=delivery==='pickup'?0:shippingPrice(env);
  if(shipping===null)throw new Rejection('invalid');
  const owner=count?await ownerForToken(env,access):null;
  const db=env.FORMS_DB;
  const availableCoupons='SELECT c.coupon_id FROM referral_coupons c WHERE c.owner_hash=? AND c.redeemed_at IS NULL AND NOT EXISTS(SELECT 1 FROM cajita_reservations r WHERE r.coupon_id=c.coupon_id)';
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO cajita_orders(id,owner_hash,coupon_count,subtotal,shipping,live,origin,created_at) '+
    'SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM ('+availableCoupons+'))>=?')
    .bind(id,owner,count,price()-500*count,shipping,live,origin,Date.now(),owner,count),
   db.prepare('INSERT INTO cajita_reservations(coupon_id,order_id) SELECT coupon_id,? FROM ('+availableCoupons+') '+
    "WHERE EXISTS(SELECT 1 FROM cajita_orders o WHERE o.id=? AND o.owner_hash IS ? AND o.coupon_count=? AND o.state='open') "+
    'AND NOT EXISTS(SELECT 1 FROM cajita_reservations WHERE order_id=?) ORDER BY coupon_id LIMIT ?')
    .bind(id,owner,id,owner,count,id,count),
  ]);
  const order=await db.prepare('SELECT * FROM cajita_orders WHERE id=?').bind(id).first();
  if(!order||order.owner_hash!==owner||order.coupon_count!==count||order.shipping!==shipping||order.origin!==origin||order.live!==live||order.state!=='open')
   throw new Rejection('conflict',409);
  if(Date.now()-order.created_at>=23*3600000)throw new Rejection('conflict',409);
  const params=new URLSearchParams({
   mode:'payment',locale:'es','payment_method_types[0]':'card','adaptive_pricing[enabled]':'false',
   'line_items[0][price_data][currency]':'eur',
   'line_items[0][price_data][unit_amount]':String(order.subtotal),
   'line_items[0][price_data][product_data][name]':'Cajita CIM Studio · dos tazitas artesanales',
   'line_items[0][quantity]':'1','metadata[order_id]':id,
   success_url:origin+'/cajita/?resultado=recibido',cancel_url:origin+'/cajita/?resultado=cancelado',
  });
  if(shipping){
   params.set('shipping_address_collection[allowed_countries][0]','ES');
   const rate='shipping_options[0][shipping_rate_data]';
   params.set(rate+'[display_name]','Envío a España');
   params.set(rate+'[type]','fixed_amount');
   params.set(rate+'[fixed_amount][amount]',String(shipping));
   params.set(rate+'[fixed_amount][currency]','eur');
  }
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
   method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),body:params,
   headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Idempotency-Key':'cajita/'+id},
  });
  if(!response.ok)throw new Rejection('unavailable',503);
  const session=await response.json();
  if(session.livemode!==Boolean(live)||!session.id?.startsWith('cs_'+mode+'_')||new URL(session.url).origin!=='https://checkout.stripe.com')
   throw new Rejection('unavailable',503);
  const saved=await db.prepare("UPDATE cajita_orders SET stripe_session=? WHERE id=? AND state='open' AND (stripe_session IS NULL OR stripe_session=?) RETURNING id")
   .bind(session.id,id,session.id).first();
  if(!saved)throw new Rejection('conflict',409);
  return json({url:session.url});
 }catch(error){return json({error:error instanceof Rejection?error.code:'unavailable'},error instanceof Rejection?error.status:503);}
}

export async function handleStripeWebhook(request,env){
 try{
  if(request.method!=='POST')return json({error:'method'},405);
  // Continue settling existing orders after new checkout is disabled.
  if(!env.FORMS_DB||!/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||''))return json({error:'unavailable'},503);
  const signature=request.headers.get('Stripe-Signature')||'';
  const parts=signature.split(',');
  const time=parts.find(part=>/^t=\d+$/.test(part))?.slice(2);
  if(!time||Math.abs(Date.now()/1000-Number(time))>300||!request.body)return json({error:'invalid'},400);
  const reader=request.body.getReader(),chunks=[];
  let size=0;
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.length;
   if(size>65536){await reader.cancel();return json({error:'invalid'},400);}
   chunks.push(value);
  }
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  let verified=false;
  for(const part of parts.filter(value=>/^v1=[a-f0-9]{64}$/.test(value))){
   const mac=Uint8Array.from(part.slice(3).match(/../g),hex=>parseInt(hex,16));
   if(await crypto.subtle.verify('HMAC',key,mac,encoder.encode(time+'.'+raw))){verified=true;break;}
  }
  if(!verified)return json({error:'invalid'},400);
  const event=JSON.parse(raw);
  if(typeof event.livemode!=='boolean'||!['checkout.session.completed','checkout.session.expired'].includes(event.type))return new Response(null,{status:204});
  const session=event.data?.object,id=session?.metadata?.order_id;
  if(!UUID.test(id||'')||session.livemode!==event.livemode||!session.id?.startsWith(event.livemode?'cs_live_':'cs_test_'))return new Response(null,{status:204});
  const db=env.FORMS_DB,order=await db.prepare('SELECT * FROM cajita_orders WHERE id=?').bind(id).first();
  if(!order||order.live!==Number(event.livemode)||order.state!=='open'||(order.stripe_session&&session.id!==order.stripe_session))return new Response(null,{status:204});
  const paid=event.type==='checkout.session.completed';
  if(paid&&(session.payment_status!=='paid'||session.currency!=='eur'||session.amount_total!==order.subtotal+order.shipping))
   return json({error:'invalid'},409);
  if(!paid&&session.status!=='expired')return json({error:'invalid'},409);
  const state=paid?'paid':'expired';
  const statements=[db.prepare("UPDATE cajita_orders SET state=?,stripe_session=? WHERE id=? AND state='open' AND (stripe_session IS NULL OR stripe_session=?)")
   .bind(state,session.id,id,session.id)];
  if(paid)statements.push(db.prepare("UPDATE referral_coupons SET redeemed_at=? WHERE redeemed_at IS NULL AND coupon_id IN (SELECT r.coupon_id FROM cajita_reservations r JOIN cajita_orders o ON o.id=r.order_id WHERE o.id=? AND o.state='paid' AND o.stripe_session=?)")
   .bind(new Date().toISOString(),id,session.id));
  statements.push(db.prepare('DELETE FROM cajita_reservations WHERE order_id IN (SELECT id FROM cajita_orders WHERE id=? AND state=? AND stripe_session=?)').bind(id,state,session.id));
  await db.batch(statements);
  return new Response(null,{status:204});
 }catch{return json({error:'unavailable'},503);}
}
