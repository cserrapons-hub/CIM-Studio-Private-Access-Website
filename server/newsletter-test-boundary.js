import {controlledTestBoundary} from './controlled-test.js';
import {json} from './forms.js';
export async function newsletterTestBoundary(request,env){
 // The test UI/config may show a draft without enabling acquisition, but must never
 // become public when CONTROLLED_TEST_MODE is absent or disabled.
 if(env.CONTROLLED_TEST_MODE!=='true'||env.SITE_LIVE==='true')return json({error:'unavailable'},503);
 try{
  const url=new URL(env.CONTROLLED_TEST_ORIGIN);
  if(url.origin!=='https://cim-studio-test.pages.dev'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)return json({error:'unavailable'},503);
 }catch{return json({error:'unavailable'},503);}
 return controlledTestBoundary(request,env);
}
