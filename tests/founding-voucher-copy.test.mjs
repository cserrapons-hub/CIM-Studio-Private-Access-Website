import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import legal from '../legal/content.js';import {sampleReceipt} from '../server/sample-receipt.js';
const obsolete=/Tarifa Fundadores|Founders Rate|15\s*%|descuento permanente|descuento de por vida|lifetime discount|permanent discount/i;
test('published commercial copy and both sample email formats contain no old promotion',()=>{
 for(const file of ['public/index.html','public/script.js','public/legal-content.js'])assert.doesNotMatch(readFileSync(file,'utf8'),obsolete,file);
 for(const lang of ['es','en']){
  const receipt=sampleReceipt({},lang);
  for(const copy of [receipt.text,receipt.html,legal[lang].terms]){
   assert.doesNotMatch(copy,obsolete);assert.match(copy,lang==='es'?/25 €/:/€25/);assert.match(copy,lang==='es'?/primera compra/:/first purchase/);assert.match(copy,lang==='es'?/sin importe mínimo/:/no minimum spend/);assert.match(copy,lang==='es'?/[Uu]n solo uso/:/[Oo]ne use|used once/);
  }
  assert.match(legal[lang].terms,/Europe\/Madrid/);
 }
});
