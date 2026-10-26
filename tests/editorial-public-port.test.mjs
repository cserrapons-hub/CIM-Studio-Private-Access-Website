import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('editorial assets are content-versioned and copied without transforming the approved behavior',()=>{
 const html=readFileSync('public/index.html','utf8');
 for(const name of ['editorial.css','editorial-effects.js']){
  const bytes=readFileSync(name),version=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  assert.ok(html.includes(name+'?v='+version+'"'));
  assert.deepEqual(readFileSync('public/'+name),bytes);
 }
 const css=readFileSync('editorial.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 assert.match(css,/\.photographic-composition\{display:block;position:relative/,'override legacy display:contents before measuring the gallery');
 assert.ok(!/\bdialog\b|\bform\b|\binput\b|\.consent|\.challenge-slot/.test(css),'editorial sheet leaves form/modal rules to current public CSS');
});
test('editorial navigation never submits requests or changes stored subscription state',()=>{
 const js=readFileSync('editorial-effects.js','utf8');
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|submit\(/.test(js));
 assert.ok(js.includes("addEventListener('cim:language',labels)"));
 assert.ok(js.includes("prefers-reduced-motion: reduce"));
});
