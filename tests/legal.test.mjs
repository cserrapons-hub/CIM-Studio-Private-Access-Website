import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import legal from '../legal/content.js';
import {legalReady,publicSettings,consent} from '../server/settings.js';
import {newsletterRelease} from '../server/newsletter-release.js';
import {handlePublicNewsletter} from '../server/newsletter-public.js';
import {handleRegistration} from '../server/registrations.js';

test('express public legal approval is versioned, scoped and integrity-linked to all documents and consents',()=>{
 assert.equal(legal.approved,true);
 assert.equal(legal.version,'public-legal-2026-10-22-v1');
 assert.equal(legal.approval.date,'2026-10-22');
 assert.equal(legal.approval.scope,'public-legal-documents-and-form-consents-only');
 const ordered={};for(const lang of ['es','en'])ordered[lang]={subscribe:consent[lang].subscribe,samples:consent[lang].samples,careers:consent[lang].careers};
 const digest=createHash('sha256').update(JSON.stringify({version:legal.version,es:legal.es,en:legal.en,consent:ordered})).digest('hex');
 assert.equal(legal.approval.contentSha256,digest);
 assert.equal(legalReady(),true);
});

test('legal approval alone cannot enable forms, send requests or make the site live',async()=>{
 for(const env of [{},{FORMS_ENABLED:'false',SITE_LIVE:'false',CONTROLLED_TEST_MODE:'false'},{FORMS_ENABLED:'true',FORMS_VERIFIED:'true',SITE_LIVE:'true'}]){
  const config=publicSettings(env,new URL('https://cimstudio.es'));
  assert.deepEqual(config.enabled,{subscribe:false,samples:false,careers:false});
  assert.equal(config.siteLive,false);assert.equal(config.siteKey,null);
  assert.deepEqual(config.legal,{es:legal.es,en:legal.en});
  assert.equal(config.legalVersion,legal.version);
 }
 assert.equal(newsletterRelease.approved,true);assert.equal(newsletterRelease.acceptedResponse.status,202);
 let calls=0;const fetcher=()=>{calls++;throw Error('Unexpected provider request');};
 for(const kind of ['subscribe','samples','careers']){
  const req=new Request('https://cimstudio.es/api/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const response=kind==='subscribe'?await handlePublicNewsletter(req,{},fetcher):await handleRegistration(req,{},kind,fetcher);
  assert.equal(response.status,503);
 }
 assert.equal(calls,0);
});

test('approved documents retain identity, purpose separation, manual Founders and agreed retention',()=>{
 assert.deepEqual(legal.business,{name:'CIM STUDIO ESPJ',taxId:'E88749155',postalAddress:'Carrer Joan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears.',privacyEmail:'admin@cimstudio.es',domain:'cimstudio.es'});
 for(const lang of ['es','en']){
  for(const key of ['notice','privacy','cookies','terms'])assert.ok(legal[lang][key].length>1000);
  for(const key of ['notice','privacy','cookies'])for(const token of ['CIM STUDIO ESPJ','E88749155','admin@cimstudio.es'])assert.ok(legal[lang][key].includes(token));
  for(const token of ['Cloudflare','GetResponse','Resend','Google Workspace','Turnstile','D1','https://www.aepd.es'])assert.ok(legal[lang].privacy.includes(token));
  assert.match(legal[lang].terms,/Europe\/Madrid/);
  assert.doesNotMatch(JSON.stringify(legal[lang]),/Microsoft|se aplicará automáticamente|will be applied automatically|CIM Production/);
 }
 assert.match(legal.es.terms,/15 % de descuento adicional sobre el Precio Profesional vigente/);
 assert.match(legal.en.terms,/additional 15% off the current Professional Price/);
 assert.match(legal.es.terms,/CIM Studio gestionará manualmente/);
 assert.match(legal.en.terms,/CIM Studio will administer Founders status manually/);
 assert.match(legal.es.terms,/aunque reciban las mismas comunicaciones que los suscriptores generales/);
 assert.match(legal.en.terms,/even if they receive the same communications as general subscribers/);
 assert.match(legal.es.terms,/darse de baja de la newsletter no elimina el beneficio/);
 assert.match(legal.en.terms,/unsubscribing from the newsletter does not remove the benefit/);
 assert.match(legal.es.privacy,/12 meses desde la recepción/);assert.match(legal.en.privacy,/12 months from receipt/);
 assert.match(legal.es.privacy,/cada 12 meses/);assert.match(legal.en.privacy,/every 12 months/);
 assert.match(legal.es.privacy,/no constituye, por sí solo, evidencia/);
 assert.match(legal.en.privacy,/does not, by itself, establish/);
});

test('review document and source reproduce the same approved ES/EN text and unchanged consents',()=>{
 const md=readFileSync('PUBLIC-LEGAL-REVIEW.md','utf8');
 for(const [lang,label] of [['es','ESPAÑOL'],['en','ENGLISH']]){
  const section=md.split('# '+label+'\n')[1].split('\n# ')[0];
  const headings=[...section.matchAll(/^## ([1-5])\. (.+)$/gm)];
  for(let i=0;i<4;i++){
   const body=section.slice(headings[i].index+headings[i][0].length,headings[i+1].index).trim().replace(/^### /gm,'').replace(/\*\*/g,'').replace(/  \n/g,'\n');
   assert.equal(legal[lang][['notice','privacy','cookies','terms'][i]],headings[i][2].toUpperCase()+'\n\n'+body);
  }
  const quotes=[...section.slice(headings[4].index).matchAll(/^> (.+)$/gm)].map(m=>m[1]);
  assert.deepEqual(quotes,[consent[lang].subscribe,consent[lang].samples,consent[lang].careers]);
 }
});

test('static legal bundle includes approved documents but no internal approval metadata or operations',()=>{
 const context={window:{}};runInNewContext(readFileSync('public/legal-content.js','utf8'),context);
 const documents=JSON.parse(JSON.stringify(context.window.cimLegalDocuments));
 assert.deepEqual(documents,{approved:true,es:legal.es,en:legal.en});
 assert.equal(documents.approval,undefined);assert.equal(documents.pendingReview,undefined);
 const html=readFileSync('public/index.html','utf8');
 assert.ok(html.indexOf('src="legal-content.js"')<html.indexOf('src="script.js"'));
 assert.equal((html.match(/type="submit" disabled/g)||[]).length,3);
 assert.match(html,/noindex, nofollow, noarchive/);
});
