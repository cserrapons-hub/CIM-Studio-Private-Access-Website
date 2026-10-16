import { publicSettings } from '../server/settings.js';
export async function onRequest({request,env,next}) {
  const response=await next(),result=new Response(response.body,response);
  const url=new URL(request.url);
  if(!publicSettings(env,url).siteLive)result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  result.headers.set('X-Content-Type-Options','nosniff');
  result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  if(url.pathname.startsWith('/api/'))result.headers.set('Cache-Control','no-store');
  return result;
}
