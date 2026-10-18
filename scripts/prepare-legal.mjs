import {writeFileSync} from 'node:fs';
import legal from '../legal/content.js';
// Public documents only: no internal review metadata, server configuration or secrets.
const documents={approved:legal.approved===true,es:legal.es,en:legal.en};
writeFileSync('public/legal-content.js', `window.cimLegalDocuments=${JSON.stringify(documents).replaceAll('<','\\u003c')};\n`);
