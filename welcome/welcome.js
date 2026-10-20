// A redirect is not evidence of confirmation. This page never records or grants benefits.
const content={
 es:{title:'Te damos la bienvenida.',intro:'Iluminación y objetos de cerámica artesanal, elaborados a mano en Mallorca.',thanks:'Gracias por acompañarnos.',home:'Volver a CIM Studio',privacy:'Privacidad',draft:'Borrador pendiente de revisión y aprobación legal.',close:'Cerrar'},
 en:{title:'Welcome to CIM Studio.',intro:'Handcrafted ceramic lighting and objects, made by hand in Mallorca.',thanks:'Thank you for joining us.',home:'Back to CIM Studio',privacy:'Privacy',draft:'Draft awaiting legal review and approval.',close:'Close'}
};
const dialog=document.getElementById('welcome-privacy');
function setLanguage(language){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=content[language][el.dataset.text]);
 document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===language)));
 document.querySelector('[data-close]').setAttribute('aria-label',content[language].close);
 document.querySelector('.languages').setAttribute('aria-label',language==='es'?'Idioma':'Language');
 document.querySelector('[data-draft]').textContent=window.cimLegalDocuments?.approved===true?'':content[language].draft;
 document.querySelector('[data-privacy-body]').textContent=window.cimLegalDocuments?.[language]?.privacy||content[language].draft;
 document.title=language==='es'?'CIM Studio — Bienvenida':'CIM Studio — Welcome';
}
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>setLanguage(el.dataset.language)));
document.querySelector('[data-privacy]').addEventListener('click',()=>dialog.showModal());
document.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
setLanguage(new URL(location.href).searchParams.get('lang')==='en'?'en':'es');
