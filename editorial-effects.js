// Editorial navigation and mobile image interaction only. No network, storage or form/integration changes.
(()=>{
 const categories={Tramuntana:['PIEZA GASTRONÓMICA','CULINARY OBJECT'],Binari:['APLIQUE','WALL LIGHT'],Fita:['SEÑALÉTICA','SIGNAGE'],Cleda:['ACCESORIO DE BAÑO','BATHROOM ACCESSORY']};
 const links=[['.editorial-scroll','invitation',['Ir a Una invitación a descubrir','Go to An invitation to discover']],['.header-scroll','editorial-photographs',['Descubrir las piezas','Discover the pieces']]];
 const mobile=matchMedia('(max-width:600px)'),frames=[...document.querySelectorAll('.photograph-frame')];
 function labels(){const en=document.documentElement.lang==='en';for(const [selector,,text] of links)document.querySelector(selector)?.setAttribute('aria-label',text[+en]);for(const e of document.querySelectorAll('[data-category]'))e.textContent=categories[e.dataset.category][+en];if(mobile.matches)for(const frame of frames){const name=frame.closest('figure').querySelector('.product-name').textContent;frame.setAttribute('aria-label',(en?'Original colours of ':'Colores originales de ')+name);}}
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
 // Native scrolling is never cancelled. Only stationary taps or keyboard activation toggle colour.
 function setActive(target){for(const frame of frames)frame.setAttribute('aria-pressed',String(frame===target));}
 function syncMobile(){for(const frame of frames){if(mobile.matches){frame.setAttribute('role','button');frame.tabIndex=0;frame.setAttribute('aria-pressed','false');}else{for(const attr of ['role','tabindex','aria-pressed','aria-label'])frame.removeAttribute(attr);}}labels();}
 for(const frame of frames){let gesture=null;
  frame.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')gesture={id:event.pointerId,x:event.clientX,y:event.clientY,cancelled:!event.isPrimary};else gesture=null;});
  frame.addEventListener('pointermove',event=>{if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.cancelled=true;},{passive:true});
  frame.addEventListener('pointercancel',()=>{if(gesture)gesture.cancelled=true;});
  addEventListener('scroll',()=>{if(gesture)gesture.cancelled=true;},{passive:true,capture:true});
  function toggle(){if(mobile.matches)setActive(frame.getAttribute('aria-pressed')==='true'?null:frame);}
  frame.addEventListener('click',event=>{if(event.detail!==0&&gesture?.cancelled)return;toggle();});
  frame.addEventListener('keydown',event=>{if(mobile.matches&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(!event.repeat)toggle();}});
 }
 mobile.addEventListener('change',syncMobile);syncMobile();
 addEventListener('cim:language',labels);labels();
})();
