import test from 'node:test';
import assert from 'node:assert/strict';
import legal from '../legal/content.js';
import {legalReady, publicSettings} from '../server/settings.js';

test('legal drafts never enable forms or expose unapproved documents through configuration', () => {
  assert.equal(legal.approved, false);
  assert.equal(legal.version, '');
  assert.equal(legalReady(), false);
  const config = publicSettings({FORMS_ENABLED:'true', FORMS_VERIFIED:'true', SITE_LIVE:'true'}, new URL('https://cimstudio.es'));
  assert.deepEqual(config.enabled, {subscribe:false,samples:false,careers:false});
  assert.equal(config.legal, null);
  assert.equal(config.siteLive, false);
});

test('both languages include all documents, business identity and accessible commercial terms', () => {
  assert.deepEqual(legal.business, {
    name:'CIM STUDIO ESPJ',taxId:'E88749155',
    postalAddress:'Carrer Joan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears.',
    privacyEmail:'admin@cimstudio.es',domain:'cimstudio.es'
  });
  for (const lang of ['es','en']) {
    for (const key of ['notice','privacy','cookies','terms']) assert.ok(legal[lang][key].length > 1000, `${lang}.${key}`);
    for (const key of ['notice','privacy','cookies']) {
      assert.ok(legal[lang][key].includes(legal.business.name));
      assert.ok(legal[lang][key].includes(legal.business.taxId));
      assert.ok(legal[lang][key].includes(legal.business.privacyEmail));
    }
    assert.ok(!legal[lang].notice.includes(legal[lang].terms), 'terms remain a single document');
    assert.ok(legal[lang].terms.includes('Europe/Madrid'));
    assert.ok(!JSON.stringify(legal[lang]).includes('info@cimstudio.es'));
    assert.ok(!/Microsoft|pedidos@cimstudio\.es/i.test(JSON.stringify(legal[lang])));
    for (const provider of ['Cloudflare','GetResponse','Resend','Google Workspace (Gmail)','Turnstile','D1']) assert.ok(legal[lang].privacy.includes(provider));
    assert.ok(legal[lang].privacy.includes('036'));
    assert.ok(legal[lang].privacy.includes('https://www.aepd.es'));
  }
  assert.match(legal.es.terms,/No existe límite de plazas/);
  assert.match(legal.es.terms,/15 % de descuento de por vida/);
  assert.match(legal.es.terms,/no acumulable con otras promociones/);
  assert.match(legal.en.terms,/lifetime 15% discount/);
  assert.match(legal.en.terms,/not with other promotions/);
  assert.ok(legal.pendingReview.length >= 6);
});

import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('static legal preview reuses the source without exposing internal metadata or approving it',()=>{
 const context={window:{}};runInNewContext(readFileSync('public/legal-content.js','utf8'),context);
 const documents=JSON.parse(JSON.stringify(context.window.cimLegalDocuments));
 assert.deepEqual(documents,{approved:false,es:legal.es,en:legal.en});
 assert.equal(documents.pendingReview,undefined);
 const html=readFileSync('public/index.html','utf8');
 assert.ok(html.indexOf('src="legal-content.js"')<html.indexOf('src="script.js"'));
 assert.match(legal.es.terms,/La baja de la newsletter no supone perder el descuento/);
 assert.match(legal.es.terms,/sin permanencia mínima/);
 assert.match(legal.en.terms,/Unsubscribing from the newsletter does not remove the discount/);
});
test('final launch decisions name CIM Production as authoritative and specify proportionate retention',()=>{
 for(const lang of ['es','en']){
  assert.ok(legal[lang].privacy.includes('CIM Production'));
  assert.ok(legal[lang].terms.includes('CIM Production'));
  for(const technology of ['Google Analytics','Meta Pixel','GetResponse Analytics'])assert.ok(legal[lang].cookies.includes(technology));
 }
 assert.ok(legal.es.privacy.includes('12 meses'));assert.ok(legal.en.privacy.includes('12 months'));
 assert.ok(legal.es.privacy.includes('Facturas:'));assert.ok(legal.en.privacy.includes('Invoices:'));
 assert.ok(legal.es.terms.includes('aunque nunca haya comprado'));assert.ok(legal.en.terms.includes('even if they have never purchased'));
 assert.equal(legal.approved,false);
});

test('approved launch decisions remain drafts and remove automatic discount promises',()=>{
 assert.equal(legal.approved,false);
 assert.equal(legal.version,'');
 assert.match(legal.es.terms,/15 % adicional sobre el Precio Profesional vigente/);
 assert.match(legal.en.terms,/additional 15% off the current Professional Price/);
 assert.match(legal.es.terms,/CIM Studio aplicará el descuento al preparar el presupuesto/);
 assert.match(legal.en.terms,/CIM Studio will apply the discount when preparing the quotation/);
 assert.match(legal.es.privacy,/12 meses desde la recepción/);
 assert.match(legal.en.privacy,/12 months from receipt/);
 assert.match(legal.es.privacy,/cada 12 meses/);
 assert.match(legal.en.privacy,/every 12 months/);
 for(const lang of ['es','en']){
  const content=JSON.stringify(legal[lang]);
  assert.doesNotMatch(content,/se aplicará automáticamente|will be applied automatically|intended to be applied automatically/);
  assert.doesNotMatch(content,/estos son demostraciones|they are demonstrations|project descriptions/i);
 }
 assert.match(legal.es.privacy,/Solo si estos medios no son suficientes/);
 assert.match(legal.en.privacy,/Only where these sources are insufficient/);
});
