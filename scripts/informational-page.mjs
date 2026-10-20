export function prepareInformationalPage(html,js,releaseReady){
 for(const id of ['subscribe-dialog','samples-dialog','careers-dialog','subscription-pending-dialog']){
  const pattern=new RegExp('<dialog id="'+id+'"[\\s\\S]*?<\\/dialog>');
  if(!pattern.test(html))throw Error('Missing expected dialog: '+id);
  html=html.replace(pattern,'');
 }
 html=html.replace('<html lang="es">','<html lang="es" data-site-mode="informational" data-release-ready="'+String(releaseReady)+'">');
 html=html.replace('<script src="integrations.js" defer></script>','');
 html=html.replace(/data-open="(?:subscribe|samples|careers)-dialog"/g,'disabled aria-disabled="true"');
 const es={primary:'Acceso privado · Próximamente',professional:'Muestras cerámicas para profesionales · Próximamente',founders:'Tarifa Fundadores: un 15 % de descuento permanente para quienes confirmen su suscripción hasta el 31 de diciembre de 2026 (Europe/Madrid).'};
 const en={primary:'Private Access · Coming soon',professional:'Ceramic glaze samples for professionals · Coming soon',founders:'Founders Rate: a permanent 15% discount for those who confirm their subscription by December 31, 2026 (Europe/Madrid).'};
 for(const [key,value] of Object.entries(es))html=html.replace(new RegExp('(data-i18n="'+key+'">)[^<]*'),(_,prefix)=>prefix+value);
 const setup='Object.assign(copy.es,'+JSON.stringify(es)+');\nObject.assign(copy.en,'+JSON.stringify(en)+');\nconst informationalPublic=document.documentElement.dataset.releaseReady==="true"&&location.hostname==="cimstudio.es";\nif(informationalPublic)document.querySelector(".preview-notice").hidden=true;\n';
 js=js.replace("let language='es';",setup+"let language='es';");
 js=js.replace("document.title='CIM Studio — '+(next==='es'?'Versión de prueba':'Test version');","document.title=informationalPublic?'CIM Studio — Private Access':'CIM Studio — '+(next==='es'?'Versión de prueba':'Test version');");
 js=js.replace('function updateLegal(){',"legalLabels.es.draft='Borrador pendiente de revisión y aprobación legal.';legalLabels.en.draft='Draft awaiting legal review and approval.';\nfunction updateLegal(){");
 return {html,js};
}
