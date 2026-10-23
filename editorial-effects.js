// Decorative navigation only. No network, storage or form/integration changes.
(()=>{
 const arrow=document.querySelector('.editorial-scroll');
 const destination=document.getElementById('invitation');
 if(!arrow||!destination)return;
 function label(){arrow.setAttribute('aria-label',document.documentElement.lang==='en'?'Go to An invitation to discover':'Ir a Una invitación a descubrir');}
 arrow.addEventListener('click',event=>{
  event.preventDefault();
  destination.focus({preventScroll:true});
  destination.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 });
 addEventListener('cim:language',label);label();
})();
