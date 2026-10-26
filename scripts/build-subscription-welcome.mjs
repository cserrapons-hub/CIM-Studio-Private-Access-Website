import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let html=await readFile('subscription-welcome/index.html','utf8');
for(const extension of ['css','js']){
 const bytes=await readFile('subscription-welcome/welcome.'+extension);
 const path='/assets/subscription-welcome.'+extension;
 html=html.replace(path+'"',path+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'"');
 await writeFile('public'+path,bytes);
}
// Pages serves .html assets at extensionless URLs; only the slash variant is redirected.
await writeFile('public/bienvenido.html',html);
