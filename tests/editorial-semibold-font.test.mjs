import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
test('desktop SemiBold is an actual weight-600 WOFF2 font, fingerprinted and self-hosted',()=>{
 const css=readFileSync('editorial.css','utf8');
 const name=css.match(/montserrat-latin-600\.([a-f0-9]{12})\.woff2/);
 assert.ok(name);const bytes=readFileSync('assets/fonts/'+name[0]);
 assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,12),name[1]);
 assert.deepEqual(readFileSync('public/assets/fonts/'+name[0]),bytes);
 assert.equal(bytes.toString('ascii',0,4),'wOF2');assert.equal(bytes.readUInt32BE(4),0x00010000);
 // WOFF2 table directory + its Brotli stream; OS/2 has no transform.
 let pos=48,offset=0,os2;
 const integer=()=>{let value=0;for(let i=0;i<5;i++){const byte=bytes[pos++];assert.ok(Number.isInteger(byte));value=value*128+(byte&127);if(!(byte&128))return value;}throw Error('Invalid WOFF2 Base128');};
 for(let i=0;i<bytes.readUInt16BE(12);i++){
  const flags=bytes[pos++],tag=flags&63,version=flags>>6;
  const custom=tag===63?bytes.toString('ascii',pos,pos+=4):null;
  const original=integer();
  const transformed=(tag===10||tag===11)?version!==3:version!==0;
  const stored=transformed?integer():original;
  if(tag===6||custom==='OS/2'){assert.equal(transformed,false);os2={offset,length:original};}
  offset+=stored;
 }
 assert.ok(os2);const stream=brotliDecompressSync(bytes.subarray(pos,pos+bytes.readUInt32BE(20)));
 assert.equal(stream.length,offset);assert.ok(os2.length>=8);
 assert.equal(stream.readUInt16BE(os2.offset+4),600,'OS/2 usWeightClass must be SemiBold, not synthetic 300/400');
});
