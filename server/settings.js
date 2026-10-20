import {informationalMode,informationalReleaseReady,canonicalPublicHost,informationalLegal,informationalLegalReady} from './site-release.js';
import {getresponseWebhookContract} from './getresponse-webhook-contract.js';
import {htmlFormReady,GETRESPONSE_FORM_ID} from './getresponse-form.js';
import legal from '../legal/content.js';
export const consent = {
  es: { careers:'Acepto recibir comunicaciones sobre oportunidades profesionales de CIM Studio y he leído la Política de Privacidad.', subscribe: 'Acepto recibir novedades de la colección por email.', samples: 'Acepto que CIM Studio contacte conmigo sobre esta solicitud.' },
  en: { careers:'I agree to receive updates about career opportunities at CIM Studio and have read the Privacy Policy.', subscribe: 'I agree to receive collection news by email.', samples: 'I agree to be contacted by CIM Studio about this request.' }
};
export function legalReady() {
  return legal.approved === true && Boolean(legal.version.trim()) &&
    Object.values(legal.business).every(v => typeof v === 'string' && v.trim()) &&
    ['es','en'].every(lang => ['notice','privacy','cookies'].every(k => legal[lang][k].trim()));
}
export function ready(env, kind) {
  if(informationalMode(env))return false;
  if(kind==='careers') return careersReady(env);
  if(kind==='samples' && env.SAMPLES_ENABLED!=='true') return false;
  if(kind==='subscribe' && env.NEWSLETTER_ENABLED!=='true') return false;
  const common = ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET'];
  const specific = kind === 'subscribe' ? ['GETRESPONSE_API_KEY','GETRESPONSE_CAMPAIGN_ID',
    'GR_CONSENT_AT_FIELD_ID','GR_CONSENT_VERSION_FIELD_ID','GR_CONSENT_TEXT_FIELD_ID','GR_LANGUAGE_FIELD_ID'] : ['RESEND_API_KEY','MAIL_FROM'];
  return env.FORMS_ENABLED === 'true' && legalReady() && Boolean(env.FORMS_DB) &&
    [...common,...specific].every(k => typeof env[k] === 'string' && env[k].trim()) && env.AUDIT_HASH_SECRET.length >= 32;
}
export function careersReady(env) {
  if(informationalMode(env))return false;
  return env.CAREERS_ENABLED==='true' && env.CAREERS_VERIFIED==='true' && legalReady() && Boolean(env.CAREERS_DB) &&
    env.CAREERS_DB!==env.FORMS_DB &&
    ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','GETRESPONSE_API_KEY','GETRESPONSE_CAREERS_CAMPAIGN_ID',
     'GR_CONSENT_AT_FIELD_ID','GR_CONSENT_VERSION_FIELD_ID','GR_CONSENT_TEXT_FIELD_ID','GR_LANGUAGE_FIELD_ID']
    .every(k=>typeof env[k]==='string' && env[k].trim()) && env.AUDIT_HASH_SECRET.length>=32 &&
    Boolean(env.GETRESPONSE_CAMPAIGN_ID?.trim()) && env.GETRESPONSE_CAREERS_CAMPAIGN_ID.trim()!==env.GETRESPONSE_CAMPAIGN_ID.trim();
}
export function publicSettings(env, url) {
  if(informationalMode(env))return {enabled:{subscribe:false,samples:false,careers:false},verified:false,siteKey:null,siteMode:'informational',siteLive:informationalReleaseReady(env,informationalLegalReady())&&canonicalPublicHost(url),legalVersion:informationalLegalReady()?informationalLegal.version:null,legal:informationalLegalReady()?{es:informationalLegal.es,en:informationalLegal.en}:null};
  const enabled = { subscribe: htmlFormReady(env,legalReady()), samples: ready(env,'samples'), careers: careersReady(env) };
  const verified = env.FORMS_VERIFIED === 'true';
  return { enabled, verified, newsletter:{provider:'getresponse-html',nativeWidgetId:GETRESPONSE_FORM_ID,reviewRequired:true}, siteKey: (enabled.samples||enabled.careers) ? env.TURNSTILE_SITE_KEY : null,
    siteLive: env.SITE_LIVE === 'true' && verified && legalReady() && enabled.subscribe && env.FOUNDERS_RECORDING_VERIFIED === 'true' && env.GETRESPONSE_WEBHOOK_GRANTS_ENABLED === 'true' && getresponseWebhookContract.confirmationSemanticsVerified && getresponseWebhookContract.authenticationVerified && getresponseWebhookContract.sourceBindingVerified && url.hostname === 'cimstudio.es',
    legalVersion: legalReady() ? legal.version : null, legal: legalReady() ? { es: legal.es, en: legal.en } : null };
}
export { legal };
