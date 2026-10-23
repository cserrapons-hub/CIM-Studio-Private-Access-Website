// Decorative navigation only. No network, storage or form/integration changes.
(()=>{
 const categories={Tramuntana:['PIEZA GASTRONÓMICA','CULINARY OBJECT'],Binari:['APLIQUE','WALL LIGHT'],Fita:['SEÑALÉTICA','SIGNAGE'],Cleda:['ACCESORIO DE BAÑO','BATHROOM ACCESSORY']};
 const links=[['.editorial-scroll','invitation',['Ir a Una invitación a descubrir','Go to An invitation to discover']],['.header-scroll','editorial-photographs',['Descubrir las piezas','Discover the pieces']]];
 function labels(){const en=document.documentElement.lang==='en';for(const [selector,,text] of links)document.querySelector(selector)?.setAttribute('aria-label',text[+en]);for(const e of document.querySelectorAll('[data-category]'))e.textContent=categories[e.dataset.category][+en];}
 for(const [selector,id] of links){const arrow=document.querySelector(selector),destination=document.getElementById(id);if(!arrow||!destination)continue;arrow.addEventListener('click',event=>{event.preventDefault();destination.focus({preventScroll:true});destination.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});}
 addEventListener('cim:language',labels);labels();
})();
