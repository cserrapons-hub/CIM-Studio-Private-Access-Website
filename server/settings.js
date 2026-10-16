import legal from '../legal/content.js';
export const consent = {
  es: { subscribe: 'Acepto recibir novedades de la colección por email.', samples: 'Acepto que CIM Studio contacte conmigo sobre esta solicitud.' },
  en: { subscribe: 'I agree to receive collection news by email.', samples: 'I agree to be contacted by CIM Studio about this request.' }
};
export function legalReady() {
  return legal.approved === true && Boolean(legal.version.trim()) &&
    Object.values(legal.business).every(v => typeof v === 'string' && v.trim()) &&
    ['es','en'].every(lang => ['notice','privacy','cookies'].every(k => legal[lang][k].trim()));
}
export function ready(env, kind) {
  const common = ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','AUDIT_HASH_SECRET'];
  const specific = kind === 'subscribe' ? ['GETRESPONSE_API_KEY','GETRESPONSE_CAMPAIGN_ID',
    'GR_CONSENT_AT_FIELD_ID','GR_CONSENT_VERSION_FIELD_ID','GR_CONSENT_TEXT_FIELD_ID','GR_LANGUAGE_FIELD_ID'] : ['RESEND_API_KEY','MAIL_FROM'];
  return env.FORMS_ENABLED === 'true' && legalReady() && Boolean(env.FORMS_DB) &&
    [...common,...specific].every(k => typeof env[k] === 'string' && env[k].trim()) && env.AUDIT_HASH_SECRET.length >= 32;
}
export function publicSettings(env, url) {
  const enabled = { subscribe: ready(env,'subscribe'), samples: ready(env,'samples') };
  const verified = env.FORMS_VERIFIED === 'true';
  return { enabled, verified, siteKey: Object.values(enabled).some(Boolean) ? env.TURNSTILE_SITE_KEY : null,
    siteLive: env.SITE_LIVE === 'true' && verified && legalReady() && Object.values(enabled).every(Boolean) && url.hostname === 'cimstudio.es',
    legalVersion: legalReady() ? legal.version : null, legal: legalReady() ? { es: legal.es, en: legal.en } : null };
}
export { legal };
