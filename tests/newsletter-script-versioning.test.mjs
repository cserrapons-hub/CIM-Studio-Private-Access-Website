import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {versionNewsletterScripts} from '../scripts/version-newsletter-scripts.mjs';
const html='<script src="script.js" defer></script><script src="integrations.js" defer></script>',files={'script.js':Buffer.from('copy'),'integrations.js':Buffer.from('handler')};
test('built modal scripts request deterministic content versions matching the actual published files',()=>{
 const built=readFileSync('public/index.html','utf8');
 for(const name of Object.keys(files)){const bytes=readFileSync('public/'+name),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);assert.ok(built.includes('src="'+name+'?v='+hash+'"'));assert.deepEqual(bytes,readFileSync(name));}
});
test('changing a modal script bypasses its old cached URL without changing other assets or attributes',()=>{
 const first=versionNewsletterScripts(html,files),second=versionNewsletterScripts(html,{...files,'integrations.js':Buffer.from('new modal handler')});
 assert.equal(versionNewsletterScripts(first,files),first);
 assert.equal(first.match(/src="script.js[^\"]+"/)[0],second.match(/src="script.js[^\"]+"/)[0]);
 assert.notEqual(first.match(/src="integrations.js[^\"]+"/)[0],second.match(/src="integrations.js[^\"]+"/)[0]);
 const legacyCache=new Map([['integrations.js','old inline handler']]);assert.equal(legacyCache.has(second.match(/src="(integrations.js[^\"]+)"/)[1]),false);
 assert.equal(second.replace(/\?v=[a-f0-9]+/g,''),html);
});
test('missing or duplicate script references fail the build instead of silently shipping an unversioned handler',()=>{
 assert.throws(()=>versionNewsletterScripts('',files));assert.throws(()=>versionNewsletterScripts(html+html,files));assert.throws(()=>versionNewsletterScripts(html,{}));
});
