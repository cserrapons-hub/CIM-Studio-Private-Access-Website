import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('homepage starts with the approved Spanish title and the runtime refresh no longer overwrites the chosen language',()=>{
 const html=readFileSync('index.html','utf8'),built=readFileSync('public/index.html','utf8');
 for(const text of [html,built])assert.match(text,/<title>CIM Studio — Cerámica artesanal de Mallorca<\/title>/);
 assert.match(readFileSync('script.js','utf8'),/CIM Studio — Handmade Ceramics from Mallorca/);
 assert.doesNotMatch(readFileSync('integrations.js','utf8'),/document\.title\s*=/);
 assert.doesNotMatch(readFileSync('scripts/prepare-launch.mjs','utf8'),/<title>/);
 assert.match(html,/class="preview-notice"/);assert.match(html,/content="noindex, nofollow, noarchive"/);
});
test('only the ceramic ceiling rose is renamed Fil while its assets, category and stable crop key are retained',()=>{
 const html=readFileSync('index.html','utf8'),roses=[...html.matchAll(/<figure[^>]*data-piece="Arrel"[\s\S]*?<\/figure>/g)].map(m=>m[0]);
 assert.equal(roses.length,2);
 for(const rose of roses){assert.match(rose,/src="assets\/editorial-v2\/06-arrel.webp"/);assert.match(rose,/alt="Fil"/);assert.match(rose,/<span class="product-name">Fil<\/span>/);assert.match(rose,/data-v2-es="ROSETÓN CERÁMICO" data-v2-en="CERAMIC CEILING ROSE"/);}
 assert.doesNotMatch(html,/alt="Arrel"|class="product-name">Arrel</);
});
