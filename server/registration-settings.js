export function registrationReady(env,kind,legalApproved){
 if(!['samples','careers'].includes(kind)||!legalApproved||env.FORMS_ENABLED!=='true'||env[(kind==='careers'?'CAREERS':'SAMPLES')+'_ENABLED']!=='true')return false;
 const verified=env[(kind==='careers'?'CAREERS':'SAMPLES')+'_VERIFIED']==='true'&&env.MAIL_RECEIPTS_VERIFIED==='true';
 const restrictedTest=env.CONTROLLED_TEST_MODE==='true'&&env.REGISTRATIONS_TEST_ENABLED==='true'&&env.CONTROLLED_TEST_ORIGIN===env.REGISTRATION_ORIGIN;
 if(!verified&&!restrictedTest)return false;
 if(env.REGISTRATIONS_STORAGE_REVIEWED!=='true')return false;
 if(!env.FORMS_DB||!env.CAREERS_DB||env.FORMS_DB===env.CAREERS_DB)return false;
 if(!['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','RESEND_API_KEY','MAIL_FROM','REGISTRATION_ORIGIN'].every(k=>typeof env[k]==='string'&&env[k].trim()))return false;
 if(env.AUDIT_HASH_SECRET.length<32||/[\r\n]/.test(env.MAIL_FROM)||!env.MAIL_FROM.includes('@'))return false;
 try{
  const url=new URL(env.REGISTRATION_ORIGIN);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return false;
  if(atob(env.SAMPLES_DATA_KEY).length!==32||atob(env.CAREERS_DATA_KEY).length!==32||atob(env.SAMPLES_DATA_KEY)===atob(env.CAREERS_DATA_KEY))return false;
 }catch{return false;}
 const days=Number(env.REGISTRATION_REVIEW_DAYS);return Number.isInteger(days)&&days>0&&days<=3650;
}
