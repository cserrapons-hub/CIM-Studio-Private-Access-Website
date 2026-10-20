import {createHash} from 'node:crypto';
import {getresponseWebhookContract} from '../server/getresponse-webhook-contract.js';
import {htmlFormReady} from '../server/getresponse-form.js';
import {readFile,writeFile} from 'node:fs/promises';
import {versionStylesheet} from './version-styles.mjs';
import {legalReady} from '../server/settings.js';
const verifiedFlow=getresponseWebhookContract.authenticationVerified&&getresponseWebhookContract.sourceBindingVerified&&getresponseWebhookContract.customerDeliveryVerified&&process.env.CIM_PRODUCTION_DELIVERY_ENABLED==='true'&&getresponseWebhookContract.shapeVerified&&getresponseWebhookContract.confirmationSemanticsVerified&&process.env.NEWSLETTER_PROVIDER==='getresponse-html'&&htmlFormReady(process.env,legalReady())&&process.env.GETRESPONSE_WEBHOOK_ENABLED==='true'&&process.env.GETRESPONSE_WEBHOOK_GRANTS_ENABLED==='true';
const live=process.env.SAMPLES_ENABLED==='true'&&process.env.CAREERS_ENABLED==='true'&&process.env.REGISTRATIONS_STORAGE_REVIEWED==='true'&&process.env.SAMPLES_VERIFIED==='true'&&process.env.CAREERS_VERIFIED==='true'&&process.env.MAIL_RECEIPTS_VERIFIED==='true'&&verifiedFlow&&process.env.SITE_LIVE==='true'&&process.env.NEWSLETTER_ENABLED==='true'&&process.env.FOUNDERS_RECORDING_VERIFIED==='true'&&process.env.FORMS_ENABLED==='true'&&process.env.FORMS_VERIFIED==='true'&&legalReady();
let html=await readFile('public/index.html','utf8');
const stylesheet=await readFile('public/styles.css');
html=versionStylesheet(html,stylesheet);
const preferences=await readFile('public/careers/preferences/index.html','utf8');
await writeFile('public/careers/preferences/index.html',preferences.replace('/styles.css"','/styles.css?v='+createHash('sha256').update(stylesheet).digest('hex').slice(0,12)+'"'));
if(live){html=html.replace('<title>CIM Studio — Versión de prueba</title>','<title>CIM Studio — Private Access</title>').replace('content="noindex, nofollow, noarchive"','content="index, follow"').replace('</head>','<link rel="canonical" href="https://cimstudio.es/"></head>');}
await writeFile('public/index.html',html);
await writeFile('public/robots.txt',live?'User-agent: *\nAllow: /\nSitemap: https://cimstudio.es/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
await writeFile('public/sitemap.xml',live?'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://cimstudio.es/</loc></url></urlset>':'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
