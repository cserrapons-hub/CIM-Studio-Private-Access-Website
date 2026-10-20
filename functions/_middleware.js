import {informationalMode,informationalReleaseReady,informationalLegalReady} from '../server/site-release.js';
import {controlledTestBoundary} from '../server/controlled-test.js';
import { publicSettings } from '../server/settings.js';
export async function onRequest({request,env,next}) {
  const blocked=await controlledTestBoundary(request,env);
  if(blocked)return blocked;
  const url=new URL(request.url),settings=publicSettings(env,url);
  if(informationalMode(env)){
    const publicReady=informationalReleaseReady(env,informationalLegalReady());
    if(publicReady&&(['cimstudio.es','www.cimstudio.es'].includes(url.hostname))&&(url.protocol!=='https:'||url.hostname==='www.cimstudio.es')){
      url.protocol='https:';url.hostname='cimstudio.es';return Response.redirect(url.href,308);
    }
    if(url.pathname==='/robots.txt')return new Response(settings.siteLive?'User-agent: *\nAllow: /\nSitemap: https://cimstudio.es/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
    if(url.pathname==='/sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(settings.siteLive?'<url><loc>https://cimstudio.es/</loc></url>':'')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
    if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/config')return new Response('{"error":"unavailable"}',{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'}});
  }
  const response=await next(),result=new Response(response.body,response);
  if(!settings.siteLive||url.pathname.startsWith('/api/'))result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  result.headers.set('X-Content-Type-Options','nosniff');
  result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  if(env.CONTROLLED_TEST_MODE==='true'){result.headers.set('Cache-Control','no-store');result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');}
  if(url.pathname.startsWith('/api/'))result.headers.set('Cache-Control','no-store');
  return result;
}
