// Decorative navigation only. No network, storage or form/integration changes.
(()=>{
 const categories={Tramuntana:['PIEZA GASTRONÓMICA','CULINARY OBJECT'],Binari:['APLIQUE','WALL LIGHT'],Fita:['SEÑALÉTICA','SIGNAGE'],Cleda:['ACCESORIO DE BAÑO','BATHROOM ACCESSORY']};
 const links=[['.editorial-scroll','invitation',['Ir a Una invitación a descubrir','Go to An invitation to discover']],['.header-scroll','editorial-photographs',['Descubrir las piezas','Discover the pieces']]];
 function labels(){const en=document.documentElement.lang==='en';for(const [selector,,text] of links)document.querySelector(selector)?.setAttribute('aria-label',text[+en]);for(const e of document.querySelectorAll('[data-category]'))e.textContent=categories[e.dataset.category][+en];}
 for(const [selector,id] of links){const arrow=document.querySelector(selector),destination=document.getElementById(id);if(!arrow||!destination)continue;arrow.addEventListener('click',event=>{event.preventDefault();destination.focus({preventScroll:true});destination.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});}
 // Centre the visible arrow's full 0–8px animation range in the actual free space.
 const cue=document.querySelector('.header-scroll'),logo=document.querySelector('.brand-image'),photo=document.querySelector('.photograph-volcan .photograph-frame');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function centreCue(){
  if(!cue||!logo||!photo)return;
  const logoBox=logo.getBoundingClientRect(),photoBox=photo.getBoundingClientRect(),cueBox=cue.getBoundingClientRect(),pathBox=cue.querySelector('path').getBoundingClientRect(),parentBox=cue.offsetParent.getBoundingClientRect();
  const visibleCentre=(pathBox.top+pathBox.bottom)/2-cueBox.top;
  const top=(logoBox.bottom+photoBox.top)/2-parentBox.top-visibleCentre-(motion.matches?0:4);
  cue.style.setProperty('--header-scroll-top',top+'px');
 }
 if(cue&&logo&&photo){const observer=new ResizeObserver(centreCue);for(const element of [logo,photo,cue,cue.offsetParent])observer.observe(element);logo.addEventListener('load',centreCue);addEventListener('resize',centreCue);motion.addEventListener('change',centreCue);centreCue();}
 // Names revealed on hover must also be reachable by keyboard on the trial desktop layout.
 const desktopNames=matchMedia('(min-width:1101px) and (hover:hover) and (pointer:fine)');
 function focusableNames(){for(const figure of document.querySelectorAll('.photograph')){
  if(desktopNames.matches)figure.setAttribute('tabindex','0');
  else{figure.removeAttribute('tabindex');if(document.activeElement===figure)figure.blur();}
 }}
 desktopNames.addEventListener('change',focusableNames);focusableNames();
 addEventListener('cim:language',labels);labels();
})();
