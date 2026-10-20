import {json} from '../../server/forms.js';
// Retired public API signup route: custom fields do not replace GetResponse's consent form.
// Keep 57afd89's server implementation for reference, but never expose that signup path.
export const onRequest=()=>json({error:'unavailable'},503);
