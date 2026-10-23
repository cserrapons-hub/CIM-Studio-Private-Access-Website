// Decorative only. No storage, network requests, form hooks or language changes.
(()=>{
 const frames=[...document.querySelectorAll('.photograph-frame')];
 if(!frames.length)return;
 const media=matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
 const positions=new Map(frames.map(frame=>[frame,0]));
 let pending=0,enabled=false;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function draw(){
  pending=0;if(!enabled)return;
  const viewport=innerHeight;
  // Read all geometry before writing any styles, avoiding layout thrashing.
  const next=frames.map(frame=>{
   const rect=frame.getBoundingClientRect(),range=Math.min(15,rect.height*.035);
   const target=clamp((viewport/2-rect.top-rect.height/2)/(viewport/2+rect.height/2),-1,1)*range;
   const current=positions.get(frame),value=current+(target-current)*.14;
   return {frame,value,settled:Math.abs(target-value)<.04};
  });
  for(const {frame,value} of next){positions.set(frame,value);frame.style.setProperty('--photo-y',value.toFixed(3)+'px');}
  if(next.some(item=>!item.settled))pending=requestAnimationFrame(draw);
 }
 function schedule(){if(enabled&&!pending)pending=requestAnimationFrame(draw);}
 function configure(){
  enabled=media.matches;
  if(enabled)schedule();
  else{
   if(pending)cancelAnimationFrame(pending);pending=0;
   for(const frame of frames){positions.set(frame,0);frame.style.removeProperty('--photo-y');}
  }
 }
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 media.addEventListener('change',configure);configure();
})();
