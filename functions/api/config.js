import { publicSettings } from '../../server/settings.js';
import { json } from '../../server/forms.js';
export const onRequestGet=({request,env})=>json(publicSettings(env,new URL(request.url)));
