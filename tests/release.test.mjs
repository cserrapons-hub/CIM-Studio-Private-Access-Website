import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {onRequest} from '../functions/_middleware.js';
test('static build includes integration, favicon and security headers but no server files',()=>{for(const file of ['index.html','styles.css','script.js','integrations.js','favicon.png','apple-touch-icon.png','_headers','robots.txt','sitemap.xml'])assert.ok(existsSync('public/'+file));for(const file of ['server/forms.js','legal/content.js','.dev.vars','migrations/0001_forms.sql','package.json'])assert.ok(!existsSync('public/'+file));assert.ok(readFileSync('public/index.html','utf8').includes('noindex, nofollow, noarchive'));assert.ok(readFileSync('public/robots.txt','utf8').includes('Disallow: /'));});
test('middleware forbids indexing an unlaunched or preview site and preserves responses',async()=>{const response=await onRequest({request:new Request('https://cimstudio.es/'),env:{},next:async()=>new Response('test',{headers:{'Content-Type':'text/html'}})});assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');assert.equal(await response.text(),'test');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');});

import {createHash} from 'node:crypto';
import {versionStylesheet} from '../scripts/version-styles.mjs';
test('built HTML requests the exact published CSS using its content version',()=>{
 const html=readFileSync('public/index.html','utf8');
 const css=readFileSync('public/styles.css');
 const expected=createHash('sha256').update(css).digest('hex').slice(0,12);
 assert.ok(html.includes(`href="styles.css?v=${expected}"`));
 assert.equal((html.match(/href="styles\.css[^"]*"/g)||[]).length,1);
 assert.deepEqual(css,readFileSync('styles.css'));
});
test('CSS version changes with content, stays stable on rebuild and replaces old versions',()=>{
 const html='<link rel="stylesheet" href="styles.css">';
 const css='body { color: black; }';
 const first=versionStylesheet(html,css);
 assert.equal(versionStylesheet(html,css),first);
 assert.equal(versionStylesheet(first,css),first);
 assert.notEqual(versionStylesheet(html,css+'\n'),first);
 assert.equal(versionStylesheet('<link rel="stylesheet" href="styles.css?v=8cf8344">',css),first);
 assert.throws(()=>versionStylesheet('<html></html>',css),/exactly one/);
 assert.throws(()=>versionStylesheet(html+html,css),/exactly one/);
});
