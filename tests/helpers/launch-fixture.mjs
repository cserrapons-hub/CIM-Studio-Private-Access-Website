import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {newsletterTestPolicy} from '../../server/newsletter-test-policy.js';
import {newsletterTestEmailHash} from '../../server/newsletter-test-allowlist.js';
export function store(careers=false){
 const sqlite=new DatabaseSync(':memory:');
 const files=careers?['careers/0001_careers.sql','careers/0002_registrations.sql','careers/0003_audit_seals.sql']:['0001_forms.sql','0003_getresponse_webhook.sql','0004_production_outbox.sql','0005_registrations.sql','0006_newsletter_consent.sql','0007_newsletter_html_deliveries.sql','0008_launch_operations.sql','0009_newsletter_api_deliveries.sql','0010_newsletter_html404_retry.sql'];
 for(const name of files)sqlite.exec(readFileSync('migrations/'+name,'utf8'));
 const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}};},sql,args:()=>args};},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.args())}));sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {db,sqlite};
}
export const policy={...newsletterTestPolicy,approved:true,version:'simulation-private-v1'};
export async function fixture(){
 const forms=store(),careers=store(true),origin='https://cim-studio-test.pages.dev';
 const env={CONTROLLED_TEST_MODE:'true',CONTROLLED_TEST_ORIGIN:origin,CONTROLLED_TEST_USER:'simulation-owner',CONTROLLED_TEST_PASSWORD:'simulation-password-at-least-32-characters',SITE_LIVE:'false',FORMS_DB:forms.db,CAREERS_DB:careers.db,FORMS_ENABLED:'true',SAMPLES_ENABLED:'true',CAREERS_ENABLED:'true',SAMPLES_VERIFIED:'true',CAREERS_VERIFIED:'true',MAIL_RECEIPTS_VERIFIED:'true',REGISTRATIONS_STORAGE_REVIEWED:'true',REGISTRATION_ORIGIN:origin,REGISTRATION_REVIEW_DAYS:'30',SAMPLES_DATA_KEY:btoa('s'.repeat(32)),CAREERS_DATA_KEY:btoa('c'.repeat(32)),NEWSLETTER_DATA_KEY:btoa('n'.repeat(32)),AUDIT_HASH_SECRET:'simulation-audit-secret-at-least-32-characters',NEWSLETTER_TEST_ALLOWLIST_SECRET:btoa('l'.repeat(32)),NEWSLETTER_TEST_LEGAL_APPROVED:'true',NEWSLETTER_OBSERVATIONS_ENABLED:'true',CONTROLLED_REVIEW_ENABLED:'true',GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID:'simulation-subscriber-type',GETRESPONSE_API_KEY:'simulation-not-a-real-key',GETRESPONSE_CAMPAIGN_ID:'simulation-campaign',TURNSTILE_SITE_KEY:'simulation-site',TURNSTILE_SECRET_KEY:'simulation-secret',RESEND_API_KEY:'simulation-no-real-key',MAIL_FROM:'CIM Test <test@example.test>'};
 env.NEWSLETTER_TEST_EMAIL_HASH=await newsletterTestEmailHash(env.NEWSLETTER_TEST_ALLOWLIST_SECRET,'owner@example.test');
 const headers={Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',Authorization:'Basic '+btoa(env.CONTROLLED_TEST_USER+':'+env.CONTROLLED_TEST_PASSWORD)};
 const request=(path,data,changes={})=>new Request(origin+path,{method:'POST',headers:{...headers,...changes},body:JSON.stringify(data)});
 const data={subscriberType:'particular',email:'owner@example.test',consent:true,language:'es',legalVersion:'simulation-private-v1',requestId:crypto.randomUUID(),token:'simulation-token',website:''};
 const sample={...data,name:'Professional',company:'Studio',discipline:'architecture',shippingAddress:'Test street 1',postalCode:'00000',city:'Test city',province:'Test region',country:'Test country'};
 const calls=[],fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('siteverify'))return Response.json({success:true,hostname:new URL(env.REGISTRATION_ORIGIN).hostname,action:options.body.get('response')==='career-token'?'careers':options.body.get('response')==='sample-token'?'samples':'subscribe'});
  if(url==='https://api.resend.com/emails')return Response.json({id:'simulation-'+calls.length});
  throw Error('Unexpected mocked provider request');
 };
 return {env,forms,careers,data,sample,request,calls,fetcher,close(){forms.sqlite.close();careers.sqlite.close();}};
}
