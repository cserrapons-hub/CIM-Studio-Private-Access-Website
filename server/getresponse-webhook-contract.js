// Deliberately incomplete: official docs were inaccessible in this environment.
// Populate ONLY after reviewing the actual provider payload and an authorized DOI test.
// Paths below are not invented GetResponse field names. Unit tests inject a SIMULATED contract.
export const getresponseWebhookContract=Object.freeze({
 shapeVerified:false,
 authenticationVerified:false,
 customerDestination:'cim-production',
 customerDeliveryVerified:false,
 confirmationSemanticsVerified:false,
 paths:null,
 eventName:'contact-subscribed',
 expectedFormId:'9748c724-790b-4c48-bbde-29366c400934'
});
function read(payload,path){
 if(!Array.isArray(path)||!path.length||path.some(key=>typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)))throw Error('Unverified path');
 let result=payload;
 for(const key of path){if(!result||typeof result!=='object'||!Object.hasOwn(result,key))return undefined;result=result[key];}
 return result;
}
const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_.:-]{1,120}$/.test(value))throw Error('Invalid event reference');return value;};
export function normalizeWebhook(payload,contract){
 if(!contract.shapeVerified||!contract.paths)throw Error('Contract not verified');
 if(read(payload,contract.paths.type)!==contract.eventName)return null;
 // Support explicitly identifies occurredAt as the UTC event instant. No fallback to createdOn/received time.
 const occurredAt=payload.occurredAt;
 if(typeof occurredAt!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(occurredAt)||!Number.isFinite(Date.parse(occurredAt))||
  new Date(occurredAt.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==occurredAt.slice(0,10))throw Error('Invalid UTC event date');
 const email=read(payload,contract.paths.email);
 if(typeof email!=='string'||email.length>254||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email.trim()))throw Error('Invalid email');
 const source=contract.paths.formId?read(payload,contract.paths.formId):null;
 return {email:email.trim().toLowerCase(),contactId:id(read(payload,contract.paths.contactId)),campaignId:id(read(payload,contract.paths.campaignId)),
  formId:source===undefined||source===null?null:id(source),occurredAt:new Date(occurredAt).toISOString()};
}
