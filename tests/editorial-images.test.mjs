import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const assets=[
 ['editorial-fita-srgb.webp',614,620],
 ['editorial-tramuntana-srgb.webp',976,1067],
 ['editorial-cleda-nueva-srgb.webp',1367,1150],
 ['editorial-binari-nueva-srgb.webp',1024,1536]
];
function chunks(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
 const result=new Map();
 for(let offset=12;offset<bytes.length;){
  const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
  assert.ok(offset+8+size<=bytes.length);
  result.set(name,bytes.subarray(offset+8,offset+8+size));
  offset+=8+size+(size%2);
 }
 return result;
}
test('editorial images ship with explicit sRGB profiles, expected dimensions and no orientation metadata',()=>{
 for(const [name,width,height] of assets){
  const file=readFileSync('assets/'+name),data=chunks(file);
  const profile=data.get('ICCP');assert.ok(profile,'missing ICC profile: '+name);
  assert.equal(profile.toString('ascii',16,20),'RGB ');
  assert.equal(profile.toString('ascii',36,40),'acsp');
  assert.ok(profile.includes(Buffer.from('sRGB'))||profile.includes(Buffer.from('0073005200470042','hex')),'ICC description must identify sRGB (ASCII or UTF-16BE)');
  const extended=data.get('VP8X');assert.ok(extended);
  assert.equal(extended.readUIntLE(4,3)+1,width);
  assert.equal(extended.readUIntLE(7,3)+1,height);
  assert.ok(!data.has('EXIF')&&!data.has('XMP '));
  assert.deepEqual(readFileSync('public/assets/'+name),file);
 }
});
test('the same processed sources are retained with the explicitly requested decorative hover filter',()=>{
 const html=readFileSync('public/index.html','utf8'),css=readFileSync('public/editorial.css','utf8');
 const sources=[...html.matchAll(/<img src="assets\/(editorial-[^"]+)"/g)].map(m=>m[1]).filter(name=>!name.startsWith('editorial-v2/'));
 assert.deepEqual(sources.toSorted(),assets.map(([name])=>name).toSorted());
 assert.ok(!/<picture|\bsrcset=/.test(html));
 const photoRule=css.match(/\.photograph img\{([^}]+)\}/)?.[1];assert.ok(photoRule);
 assert.match(photoRule,/filter:saturate\(0\.2\)/);
 assert.match(css,/filter:saturate\(1\)/);
 assert.ok(!/brightness\(/.test(css));
 for(const name of ['Tramuntana','Binari','Fita','Cleda'])assert.ok(html.includes('<span class="product-name">'+name+'</span>'));
 assert.match(html,/<div class="photograph-frame"><div class="photograph-motion"><img/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(hover:none\),\(pointer:coarse\)/);
 assert.match(photoRule,/700ms/);
 assert.equal((html.match(/class="editorial-scroll"/g)||[]).length,1);
 assert.ok(html.indexOf('class="editorial-scroll"')>html.indexOf('<span class="product-name">Cleda</span>'));
 assert.match(html,/id="invitation"/);
});
