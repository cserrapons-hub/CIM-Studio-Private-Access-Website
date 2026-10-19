import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const assets=[
 ['cover-pool-s135-b120-srgb.webp',700,706],
 ['cover-volcan-s135-b120-srgb.webp',1000,1093],
 ['cover-soporte-s135-b120-srgb.webp',1100,719],
 ['cover-tramuntana-s135-b120-srgb.webp',694,1536]
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
  assert.ok(profile.includes(Buffer.from('sRGB')),'profile must identify sRGB');
  const extended=data.get('VP8X');assert.ok(extended);
  assert.equal(extended.readUIntLE(4,3)+1,width);
  assert.equal(extended.readUIntLE(7,3)+1,height);
  assert.ok(!data.has('EXIF')&&!data.has('XMP '));
  assert.deepEqual(readFileSync('public/assets/'+name),file);
 }
});
test('the same four processed sources are used at all breakpoints without a second CSS filter',()=>{
 const html=readFileSync('public/index.html','utf8'),css=readFileSync('public/styles.css','utf8');
 const sources=[...html.matchAll(/<figure class="photograph [^>]+><img src="assets\/([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(sources,assets.map(([name])=>name));
 assert.ok(!/<picture|\bsrcset=/.test(html));
 const photoRule=css.match(/\.photograph img\{([^}]+)\}/)?.[1];assert.ok(photoRule);
 assert.ok(!/\bfilter\s*:/.test(photoRule));
 assert.ok(!/saturate\(|brightness\(/.test(css));
});
