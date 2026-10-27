import {newsletterTestBoundary} from '../server/newsletter-test-boundary.js';
import {controlledTestBoundary} from '../server/controlled-test.js';
import { publicSettings } from '../server/settings.js';
export async function onRequest({request,env,next}) {
  // Canonicalise navigation before serving a form; never replay submitted data
  // across origins. Exact host matching leaves private Pages previews untouched.
  const canonicalUrl=new URL(request.url);
  if(canonicalUrl.hostname==='www.cimstudio.es'&&['GET','HEAD'].includes(request.method)){
    canonicalUrl.protocol='https:';canonicalUrl.hostname='cimstudio.es';canonicalUrl.port='';
    return new Response(null,{status:308,headers:{Location:canonicalUrl.href,'Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'}});
  }
  let path;
  try{path=new URL('https://path.invalid'+decodeURIComponent(new URL(request.url).pathname).replace(/\\/g,'/')).pathname.replace(/\/+/g,'/');}catch{return new Response('Invalid path',{status:400});}
  const privateTest=path==='/controlled/registrations'||path.startsWith('/controlled/registrations/')||path==='/controlled/newsletter'||path.startsWith('/controlled/newsletter/')||path==='/api/controlled'||path.startsWith('/api/controlled/');
  const blocked=await (privateTest?newsletterTestBoundary(request,env):controlledTestBoundary(request,env));
  if(blocked)return blocked;
  const response=await next(),result=new Response(response.body,response);
  const url=new URL(request.url);
  if(!publicSettings(env,url).siteLive)result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  result.headers.set('X-Content-Type-Options','nosniff');
  result.headers.set('Referrer-Policy',privateTest?'no-referrer':'strict-origin-when-cross-origin');
  if(env.CONTROLLED_TEST_MODE==='true'){result.headers.set('Cache-Control','no-store');result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');}
  if(url.pathname.startsWith('/api/'))result.headers.set('Cache-Control','no-store');
  return result;
}
