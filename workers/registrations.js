import {drainRegistrationMail} from '../server/registrations.js';
export default {async scheduled(controller,env,ctx){
 if(env.MAIL_WORKER_ENABLED!=='true')return;
 ctx.waitUntil((async()=>{
  for(const kind of ['samples','careers']){try{
   const result=await drainRegistrationMail(env,kind);
   const db=kind==='careers'?env.CAREERS_DB:env.FORMS_DB;
   const due=db?await db.prepare("SELECT COUNT(*) n FROM registrations WHERE state IN ('active','pending') AND review_due<?").bind(new Date().toISOString()).first():null;
   if(result.review||due?.n)console.warn('CIM registration review required',kind,{mail:result.review,retention:due?.n||0});
  }catch{console.warn('CIM registration worker unavailable',kind);}}
 })());
}};
