import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareInformationalPage} from '../scripts/informational-page.mjs';
import {informationalReleaseReady,informationalLegal} from '../server/site-release.js';
import {publicSettings,legal,ready} from '../server/settings.js';
import {onRequest} from '../functions/_middleware.js';
const env={SITE_MODE:'informational',SITE_LIVE:'true'};
const next=async()=>new Response('page');
test('informational output has no forms, collecting dialogs or integration script; photos stay intact',()=>{
 const html=readFileSync('index.html','utf8'),js=readFileSync('script.js','utf8');
 const prepared=prepareInformationalPage(html,js,false);
 assert.ok(!/<form\b|data-open="(?:subscribe|samples|careers)-dialog"|src="integrations.js"/.test(prepared.html));
 assert.equal((prepared.html.match(/disabled aria-disabled="true"/g)||[]).length,3);
 assert.match(prepared.html,/Próximamente/);assert.match(prepared.js,/Coming soon/);
 assert.match(prepared.html,/31 de diciembre de 2026/);assert.match(prepared.html,/15 %/);
 assert.deepEqual([...prepared.html.matchAll(/<figure[\s\S]*?<\/figure>/g)].map(x=>x[0]),[...html.matchAll(/<figure[\s\S]*?<\/figure>/g)].map(x=>x[0]));
 assert.ok(prepared.html.includes('id="legal-dialog"'));assert.ok(!/fetch\s*\(|localStorage|document\.cookie/.test(prepared.js));
 assert.match(prepared.html,/data-release-ready="false"/);
});
test('informational publication is independent of forms/Production but never bypasses legal or test mode',()=>{
 assert.equal(informationalReleaseReady(env,true),true);assert.equal(informationalReleaseReady(env,false),false);
 assert.equal(informationalReleaseReady({...env,CONTROLLED_TEST_MODE:'true'},true),false);
 assert.equal(legal.approved,false);assert.equal(publicSettings(env,new URL('https://cimstudio.es')).siteLive,false);
 const hostile={...env,FORMS_ENABLED:'true',SAMPLES_ENABLED:'true',CAREERS_ENABLED:'true',NEWSLETTER_ENABLED:'true'};
 for(const kind of ['subscribe','samples','careers'])assert.equal(ready(hostile,kind),false);
 assert.deepEqual(publicSettings(hostile,new URL('https://cimstudio.es')).enabled,{subscribe:false,samples:false,careers:false});
});
test('preview hosts remain noindex and disallow robots; informational APIs stay blocked',async()=>{
 const response=await onRequest({request:new Request('https://preview.pages.dev/'),env,next});assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 const robots=await onRequest({request:new Request('https://preview.pages.dev/robots.txt'),env,next});assert.match(await robots.text(),/Disallow: \//);
 for(const path of ['subscribe','samples','careers','webhooks/getresponse']){
  const result=await onRequest({request:new Request('https://cimstudio.es/api/'+path,{method:'POST'}),env,next});assert.equal(result.status,503);
 }
});
test('approved canonical public site is indexable without customer synchronization; www and HTTP redirect safely',async()=>{
 const original=structuredClone(informationalLegal);
 try{
  informationalLegal.approved=true;informationalLegal.version='simulation-only';
  assert.equal(publicSettings(env,new URL('https://cimstudio.es')).siteLive,true);
  const page=await onRequest({request:new Request('https://cimstudio.es/'),env,next});assert.equal(page.headers.has('X-Robots-Tag'),false);
  const robots=await onRequest({request:new Request('https://cimstudio.es/robots.txt'),env,next});assert.match(await robots.text(),/Allow: \//);
  const preview=await onRequest({request:new Request('https://preview.pages.dev/robots.txt'),env,next});assert.match(await preview.text(),/Disallow: \//);
  for(const url of ['https://www.cimstudio.es/a?x=1','http://cimstudio.es/a?x=1']){
   const result=await onRequest({request:new Request(url),env,next});assert.equal(result.status,308);assert.equal(result.headers.get('Location'),'https://cimstudio.es/a?x=1');
  }
 }finally{Object.assign(informationalLegal,original);}
});

test('informational legal candidate matches active data processing and stays unapproved',()=>{
 assert.equal(informationalLegal.approved,false);assert.equal(informationalLegal.version,'');
 assert.deepEqual(informationalLegal.business,legal.business);
 for(const lang of ['es','en'])for(const key of ['notice','privacy','cookies','terms'])assert.ok(informationalLegal[lang][key].length>500);
 for(const lang of ['es','en']){
  assert.ok(informationalLegal[lang].privacy.includes('Google Workspace (Gmail)'));
  assert.ok(informationalLegal[lang].privacy.includes('admin@cimstudio.es'));
  assert.ok(informationalLegal[lang].terms.endsWith(legal[lang].terms));
 }
});
