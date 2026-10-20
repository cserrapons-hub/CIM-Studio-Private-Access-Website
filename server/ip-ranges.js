// No X-Forwarded-For parsing. Only Cloudflare's own client-IP header is trusted.
function address(value){
 if(typeof value!=='string'||value.includes('%')||value.includes('['))throw Error('Invalid IP');
 if(!value.includes(':')){
  const parts=value.split('.');
  if(parts.length!==4||parts.some(p=>!/^(0|[1-9]\d{0,2})$/.test(p)||Number(p)>255))throw Error('Invalid IPv4');
  return {bits:32,value:parts.reduce((n,p)=>(n<<8n)|BigInt(p),0n)};
 }
 let ip=value.toLowerCase();
 if(ip.includes('.')){const i=ip.lastIndexOf(':'),v4=address(ip.slice(i+1));ip=ip.slice(0,i)+':'+(v4.value>>16n).toString(16)+':'+(v4.value&65535n).toString(16);}
 if((ip.match(/::/g)||[]).length>1)throw Error('Invalid IPv6');
 let groups;
 if(ip.includes('::')){
  const [left,right]=ip.split('::'),a=left?left.split(':'):[],b=right?right.split(':'):[];
  if(a.length+b.length>=8)throw Error('Invalid IPv6');
  groups=[...a,...Array(8-a.length-b.length).fill('0'),...b];
 }else groups=ip.split(':');
 if(groups.length!==8||groups.some(g=>!/^[a-f0-9]{1,4}$/.test(g)))throw Error('Invalid IPv6');
 return {bits:128,value:groups.reduce((n,g)=>(n<<16n)|BigInt('0x'+g),0n)};
}
export function allowedSender(ip,cidrs){
 try{
  const candidate=address(ip);
  if(typeof cidrs!=='string'||cidrs.length>12000)return false;
  const ranges=cidrs.split(',').map(s=>s.trim());
  if(!ranges.length||ranges.length>256)return false;
  // Reject an invalid allowlist in its entirety, including unsafe catch-all ranges.
  const parsed=ranges.map(cidr=>{
   const parts=cidr.split('/');if(parts.length!==2||!/^\d{1,3}$/.test(parts[1]))throw Error();
   const network=address(parts[0]),prefix=Number(parts[1]);
   if(prefix<(network.bits===32?8:16)||prefix>network.bits)throw Error();
   return {...network,shift:BigInt(network.bits-prefix)};
  });
  return parsed.some(n=>n.bits===candidate.bits&&(n.value>>n.shift)===(candidate.value>>n.shift));
 }catch{return false;}
}
