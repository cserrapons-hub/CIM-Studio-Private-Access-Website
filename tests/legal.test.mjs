import test from 'node:test';
import assert from 'node:assert/strict';
import legal from '../legal/content.js';
import {legalReady, publicSettings} from '../server/settings.js';

test('legal drafts never enable forms or expose unapproved documents', () => {
  assert.equal(legal.approved, false);
  assert.equal(legal.version, '');
  assert.equal(legalReady(), false);
  const config = publicSettings({FORMS_ENABLED:'true', FORMS_VERIFIED:'true', SITE_LIVE:'true'}, new URL('https://cimstudio.es'));
  assert.deepEqual(config.enabled, {subscribe:false,samples:false});
  assert.equal(config.legal, null);
  assert.equal(config.siteLive, false);
});

test('both languages include all documents, business identity and accessible commercial terms', () => {
  assert.deepEqual(legal.business, {
    name:'CIM STUDIO ESPJ',taxId:'E88749155',
    postalAddress:'C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.',
    privacyEmail:'info@cimstudio.es'
  });
  for (const lang of ['es','en']) {
    for (const key of ['notice','privacy','cookies','terms']) assert.ok(legal[lang][key].length > 1000, `${lang}.${key}`);
    for (const key of ['notice','privacy','cookies']) {
      assert.ok(legal[lang][key].includes(legal.business.name));
      assert.ok(legal[lang][key].includes(legal.business.taxId));
      assert.ok(legal[lang][key].includes(legal.business.privacyEmail));
    }
    assert.ok(legal[lang].notice.includes(legal[lang].terms));
    for (const provider of ['Cloudflare','GetResponse','Resend','Microsoft 365','Turnstile','D1']) assert.ok(legal[lang].privacy.includes(provider));
    assert.ok(legal[lang].privacy.includes('036'));
    assert.ok(legal[lang].privacy.includes('https://www.aepd.es'));
  }
  assert.match(legal.es.terms,/No existe límite de plazas/);
  assert.match(legal.es.terms,/15 % de descuento permanente/);
  assert.match(legal.es.terms,/no acumulable con otras promociones/);
  assert.match(legal.en.terms,/permanent 15% discount/);
  assert.match(legal.en.terms,/not with other promotions/);
  assert.ok(legal.pendingReview.length >= 6);
});
