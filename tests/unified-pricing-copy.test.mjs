import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import legal from '../legal/content.js';
test('public documents remove professional pricing and its unnecessary verification while retaining consumer rights',()=>{
 for(const lang of ['es','en']){
  const copy=JSON.stringify(legal[lang]);assert.doesNotMatch(copy,/precio(s)? profesional|tarifa(s)? profesional|professional pric|professional rat|special pric|professional discount|modelo 036|professional verification|verificación profesional/i);
  assert.match(copy,lang==='es'?/personas consumidoras/:/consumer rights/);
  assert.match(legal[lang].terms,lang==='es'?/no los revoca ni modifica/:/does not revoke or amend them/);
 }
});
test('subscriber audience remains required with unchanged provider values and communication-only purpose',()=>{
 const html=readFileSync('public/index.html','utf8');assert.match(html,/<select id="subscriber-type" name="subscriberType" required>/);assert.match(html,/<option value="particular"[^>]*>Particular<\/option>/);assert.match(html,/<option value="profesional"[^>]*>Profesional<\/option>/);
 assert.match(legal.es.privacy,/clasificación autodeclarada como Particular o Profesional/);assert.match(legal.es.privacy,/no se utiliza para establecer precios diferentes/);assert.match(legal.en.privacy,/classification is not used to set different prices/);
});
test('open private access has the approved descriptions and CTA without duplicate promotion blocks',()=>{
 const html=readFileSync('public/index.html','utf8'),js=readFileSync('public/script.js','utf8');
 assert.match(html,/<h1 data-i18n="title">Accede a nuestra<br>colección privada\.<\/h1>/);
 assert.match(html,/<p class="intro" data-i18n="intro">Suscríbete a nuestra newsletter/);assert.match(js,/Subscribe to our newsletter to discover/);
 assert.match(html,/Durante nuestro primer año, las novedades y los enlaces de compra/);assert.doesNotMatch(html,/data-i18n="founders"/);
 assert.match(html,/<span data-i18n="primary">Solicitar acceso<\/span>/);assert.ok(js.includes("primary:'Request access'"));
});
