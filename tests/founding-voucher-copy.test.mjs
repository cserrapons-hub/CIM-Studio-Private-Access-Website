import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import legal from '../legal/content.js';import historical from '../legal/history/2026-11-10-before-promotion-withdrawal.js';import {sampleReceipt} from '../server/sample-receipt.js';import {consent} from '../server/settings.js';
const obsolete=/Tarifa Fundadores|Founders Rate|15\s*%|25\s*(?:€|EUR)|€25|voucher|miembro fundador|founding member|descuento permanente|descuento de por vida|lifetime discount|permanent discount|31\/12\/2026|31 de diciembre de 2026|(?:December 31|31 December),? 2026/i;
test('active public communications and sample email alternatives advertise no promotion, deadline or replacement gift',()=>{
 for(const file of ['public/index.html','public/script.js','public/legal-content.js','public/careers/preferences/preferences.js','public/careers/preferences/index.html']){
  const content=readFileSync(file,'utf8');assert.doesNotMatch(content.replace(/<[^>]*>/g,''),obsolete,file);assert.doesNotMatch(content,/lead magnet|catálogo descargable|kit profesional|downloadable catalog|professional kit/i);
 }
 for(const lang of ['es','en'])for(const copy of [sampleReceipt({},lang).text,sampleReceipt({},lang).html,legal[lang].terms,legal[lang].privacy])assert.doesNotMatch(copy,obsolete);
});
test('historical terms retain exact evidence and original approval integrity without being published as a current offer',()=>{
 assert.match(historical.es.terms,/25 €/);assert.match(historical.en.terms,/€25/);assert.match(historical.es.terms,/31 de diciembre de 2026/);assert.match(historical.en.terms,/31 December 2026/);
 const ordered={};for(const lang of ['es','en'])ordered[lang]={subscribe:consent[lang].subscribe,samples:consent[lang].samples,careers:consent[lang].careers};
 assert.equal(createHash('sha256').update(JSON.stringify({version:historical.version,es:historical.es,en:historical.en,consent:ordered})).digest('hex'),historical.approval.contentSha256);
 assert.equal(existsSync('public/legal/history/2026-11-10-before-promotion-withdrawal.js'),false);assert.equal(legal.version,historical.version);
 assert.match(legal.es.terms,/no los revoca ni modifica/);assert.match(legal.en.terms,/does not revoke or amend them/);
});
