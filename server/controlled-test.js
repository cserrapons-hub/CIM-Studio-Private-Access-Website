// Optional HTTP Basic boundary for a dedicated HTTPS preview. No public activation.
const encoder=new TextEncoder();
async function digest(text){return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)));}
async function equal(a,b){const x=await digest(a),y=await digest(b);let different=0;for(let n=0;n<x.length;n++)different|=x[n]^y[n];return different===0;}
function denied(status,challenge=false){return new Response('Controlled test unavailable',{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive',...(challenge?{'WWW-Authenticate':'Basic realm="CIM Studio controlled test", charset="UTF-8"'}:{})}});}
export async function controlledTestBoundary(request,env){
 if(env.CONTROLLED_TEST_MODE!=='true')return null;
 let origin;
 try{origin=new URL(env.CONTROLLED_TEST_ORIGIN);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error();}catch{return denied(503);}
 if(new URL(request.url).origin!==origin.origin)return denied(403);
 const user=env.CONTROLLED_TEST_USER,password=env.CONTROLLED_TEST_PASSWORD;
 if(typeof user!=='string'||!user||/[\x00-\x20\x7f:]/.test(user)||typeof password!=='string'||password.length<32||/[\x00-\x1f\x7f]/.test(password))return denied(503);
 // Provider cannot perform browser login. ONLY the exact webhook route is exempt;
 // its own disabled-by-default authentication/verification remains mandatory.
 if(new URL(request.url).pathname==='/api/webhooks/getresponse'&&request.method==='POST')return null;
 const auth=request.headers.get('Authorization')||'';
 if(auth.length>2048||!auth.startsWith('Basic '))return denied(401,true);
 let supplied;
 try{supplied=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(auth.slice(6)),c=>c.charCodeAt(0)));}catch{return denied(401,true);}
 return await equal(supplied,user+':'+password)?null:denied(401,true);
}
