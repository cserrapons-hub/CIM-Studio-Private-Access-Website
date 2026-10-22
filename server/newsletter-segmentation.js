// Self-declared audience, not professional accreditation or Founders eligibility.
import {Rejection} from './forms.js';
export function subscriberType(value){
 if(value!=='particular'&&value!=='profesional')throw new Rejection('subscriber_type');
 return value;
}
export function segmentationReady(env){
 const id=env.GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID;
 return typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&id!=='njH9fM';
}
