// Presentation only: a visit is never proof of confirmation or a Founders entitlement.
(()=>{
 const copy={
  es:{title:'Bienvenido a nuestro universo.',confirmed:'Tu suscripción se ha confirmado correctamente.',discover:'A partir de ahora, serás de los primeros en descubrir nuestras nuevas piezas y colecciones.',thanks:'Gracias por formar parte de CIM Studio.'},
  en:{title:'Welcome to our universe.',confirmed:'Your subscription has been successfully confirmed.',discover:"From now on, you'll be among the first to discover our new pieces and collections.",thanks:'Thank you for being part of CIM Studio.'}
 };
 function setLanguage(language){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=copy[language][element.dataset.i18n];});
  document.querySelectorAll('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===language)));
  document.querySelector('.languages').setAttribute('aria-label',language==='es'?'Idioma':'Language');
  document.title='CIM Studio — '+copy[language].title;
  window.dispatchEvent(new Event('cim:language'));
 }
 document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.lang)));
 setLanguage('es');
})();
