import {createHash} from 'node:crypto';
// Keep the modal copy and its handler tied to the exact built JavaScript bytes.
export function versionNewsletterScripts(html,scripts){
 for(const name of ['script.js','integrations.js']){
  const reference=new RegExp('src="'+name.replace('.','\\.')+'(?:\\?v=[a-f0-9]+)?"','g');
  if([...html.matchAll(reference)].length!==1||!scripts[name])throw Error('Expected one built newsletter script reference');
  const version=createHash('sha256').update(scripts[name]).digest('hex').slice(0,12);
  html=html.replace(reference,'src="'+name+'?v='+version+'"');
 }
 return html;
}
