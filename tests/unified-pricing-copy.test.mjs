import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import legal from '../legal/content.js';
test('public documents remove professional pricing and its unnecessary verification while retaining consumer rights',()=>{
 for(const lang of ['es','en']){
  const copy=JSON.stringify(legal[lang]);assert.doesNotMatch(copy,/precio(s)? profesional|tarifa(s)? profesional|professional pric|professional rat|special pric|professional discount|modelo 036|professional verification|verificación profesional/i);
  assert.match(copy,lang==='es'?/personas consumidoras/:/consumer rights/);
  assert.match(legal[lang].terms,lang==='es'?/Un solo uso|un solo uso/:/used once/);
 }
});
test('subscriber audience remains required with unchanged provider values and communication-only purpose',()=>{
 const html=readFileSync('public/index.html','utf8');assert.match(html,/<select id="subscriber-type" name="subscriberType" required>/);assert.match(html,/<option value="particular"[^>]*>Particular<\/option>/);assert.match(html,/<option value="profesional"[^>]*>Profesional<\/option>/);
 assert.match(legal.es.privacy,/clasificación autodeclarada como Particular o Profesional/);assert.match(legal.es.privacy,/no se utiliza para establecer precios diferentes/);assert.match(legal.en.privacy,/classification is not used to set different prices/);
});
test('private collection leads the bilingual offer without adding presentation blocks or changing the CTA',()=>{
 const html=readFileSync('public/index.html','utf8'),js=readFileSync('public/script.js','utf8');
 assert.match(html,/<p class="intro" data-i18n="intro">Descubre nuestra colección privada[^<]+<\/p><p class="intro" data-i18n="founders">Solicita tu acceso[^<]+<\/p>/);
 assert.match(js,/Discover our private collection/);assert.match(js,/Request access before 31 December 2026/);
 assert.match(html,/<span data-i18n="primary">Acceder a la colección privada<\/span>/);assert.ok(js.includes("primary:'Access the private collection'"));
});
