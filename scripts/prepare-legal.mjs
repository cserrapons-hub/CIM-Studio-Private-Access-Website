import {writeFileSync} from 'node:fs';
import fullLegal from '../legal/content.js';
import informationalLegal from '../legal/informational.js';
const legal=process.env.SITE_MODE==='informational'?informationalLegal:fullLegal;
// Public documents only: no internal review metadata, server configuration or secrets.
const documents={approved:legal.approved===true,es:legal.es,en:legal.en};
writeFileSync('public/legal-content.js', `window.cimLegalDocuments=${JSON.stringify(documents).replaceAll('<','\\u003c')};\n`);
