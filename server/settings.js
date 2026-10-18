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
  if(kind==='careers') return careersReady(env);
  const common = ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET'];
  const specific = kind === 'subscribe' ? ['GETRESPONSE_API_KEY','GETRESPONSE_CAMPAIGN_ID',
    'GR_CONSENT_AT_FIELD_ID','GR_CONSENT_VERSION_FIELD_ID','GR_CONSENT_TEXT_FIELD_ID','GR_LANGUAGE_FIELD_ID'] : ['RESEND_API_KEY','MAIL_FROM'];
  return env.FORMS_ENABLED === 'true' && legalReady() && Boolean(env.FORMS_DB) &&
    [...common,...specific].every(k => typeof env[k] === 'string' && env[k].trim()) && env.AUDIT_HASH_SECRET.length >= 32;
}
export function careersReady(env) {
  return env.CAREERS_ENABLED==='true' && env.CAREERS_VERIFIED==='true' && legalReady() && Boolean(env.CAREERS_DB) &&
    env.CAREERS_DB!==env.FORMS_DB &&
    ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET','GETRESPONSE_API_KEY','GETRESPONSE_CAREERS_CAMPAIGN_ID',
     'GR_CONSENT_AT_FIELD_ID','GR_CONSENT_VERSION_FIELD_ID','GR_CONSENT_TEXT_FIELD_ID','GR_LANGUAGE_FIELD_ID']
    .every(k=>typeof env[k]==='string' && env[k].trim()) && env.AUDIT_HASH_SECRET.length>=32 &&
    Boolean(env.GETRESPONSE_CAMPAIGN_ID?.trim()) && env.GETRESPONSE_CAREERS_CAMPAIGN_ID.trim()!==env.GETRESPONSE_CAMPAIGN_ID.trim();
}
export function publicSettings(env, url) {
  const enabled = { subscribe: ready(env,'subscribe'), samples: ready(env,'samples'), careers: careersReady(env) };
  const verified = env.FORMS_VERIFIED === 'true';
  return { enabled, verified, siteKey: Object.values(enabled).some(Boolean) ? env.TURNSTILE_SITE_KEY : null,
    siteLive: env.SITE_LIVE === 'true' && verified && legalReady() && (enabled.subscribe && enabled.samples) && url.hostname === 'cimstudio.es',
    legalVersion: legalReady() ? legal.version : null, legal: legalReady() ? { es: legal.es, en: legal.en } : null };
}
export { legal };
