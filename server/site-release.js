import informationalLegal from '../legal/informational.js';
export {informationalLegal};
export const informationalLegalReady=()=>informationalLegal.approved===true&&Boolean(informationalLegal.version.trim())&&['es','en'].every(lang=>['notice','privacy','cookies','terms'].every(key=>informationalLegal[lang][key]?.trim()))&&Object.values(informationalLegal.business).every(value=>typeof value==='string'&&value.trim());
export const informationalMode=env=>env.SITE_MODE==='informational';
// Informational publishing is independent of newsletter, webhooks and CIM Production.
// Express legal review is still required. Preview/test hosts never become indexable.
export const informationalReleaseReady=(env,legalApproved)=>informationalMode(env)&&env.SITE_LIVE==='true'&&env.CONTROLLED_TEST_MODE!=='true'&&legalApproved===true;
export const canonicalPublicHost=url=>url.hostname==='cimstudio.es';
