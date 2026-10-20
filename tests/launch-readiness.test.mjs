import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publicSettings} from '../server/settings.js';
test('Montserrat is self-hosted, fingerprinted, preloaded, licensed and uses only the two required weights',()=>{
 const css=readFileSync('styles.css','utf8'),html=readFileSync('public/index.html','utf8');
 const fonts=[...css.matchAll(/assets\/fonts\/(montserrat-latin-(300|400)\.([a-f0-9]{12})\.woff2)/g)];
 assert.equal(fonts.length,2);
 for(const [,name,,digest] of fonts){const bytes=readFileSync('assets/fonts/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,12),digest);assert.deepEqual(readFileSync('public/assets/fonts/'+name),bytes);assert.ok(html.includes('href="assets/fonts/'+name+'" as="font"'));}
 assert.ok(existsSync('public/assets/fonts/OFL-Montserrat.txt'));assert.ok(css.includes("--serif:Georgia,'Times New Roman',serif"));assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(css+html));
});
test('Welcome is bilingual and never interprets visits or query parameters as confirmation',()=>{
 const html=readFileSync('public/bienvenida/index.html','utf8'),js=readFileSync('public/bienvenida/welcome.js','utf8');
 assert.ok(html.includes('noindex,nofollow,noarchive'));assert.ok(html.includes('/styles.css'));assert.ok(js.includes('Te damos la bienvenida.'));assert.ok(js.includes('Welcome to CIM Studio.'));
 assert.ok(!/fetch\s*\(|localStorage|sessionStorage|document\.cookie|confirmedAt|\/api\//.test(js));
 assert.ok(!html.includes('integrations.js'));assert.ok(!existsSync('public/server/founders.js'));
});
test('Public defaults leave all forms and the live site disabled',()=>{
 const settings=publicSettings({},new URL('https://cimstudio.es'));
 assert.deepEqual(settings.enabled,{subscribe:false,samples:false,careers:false});assert.equal(settings.siteLive,false);
});
