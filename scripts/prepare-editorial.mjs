import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let html=await readFile('public/index.html','utf8');
for(const name of ['editorial.css','editorial-effects.js']){
 const bytes=await readFile(name);
 await writeFile('public/'+name,bytes);
 html=html.replace(name+'"',name+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'"');
}
for(const name of ['editorial-tramuntana-srgb.webp','editorial-binari-nueva-srgb.webp','editorial-fita-srgb.webp','editorial-cleda-nueva-srgb.webp'])await writeFile('public/assets/'+name,await readFile('assets/'+name));
await writeFile('public/index.html',html);

await mkdir('public/assets/editorial-v2',{recursive:true});
for(const name of await readdir('assets/editorial-v2'))if(name.endsWith('.webp'))await writeFile('public/assets/editorial-v2/'+name,await readFile('assets/editorial-v2/'+name));
