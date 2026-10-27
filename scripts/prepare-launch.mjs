import {createHash} from 'node:crypto';
import {newsletterBuildReady} from '../server/newsletter-release.js';
import {readFile,writeFile} from 'node:fs/promises';
import {versionStylesheet} from './version-styles.mjs';
import {versionNewsletterScripts} from './version-newsletter-scripts.mjs';
import {legalReady} from '../server/settings.js';
const live=process.env.CONTROLLED_TEST_MODE!=='true'&&newsletterBuildReady(process.env,legalReady())&&process.env.SAMPLES_ENABLED==='true'&&process.env.CAREERS_ENABLED==='true'&&process.env.REGISTRATIONS_STORAGE_REVIEWED==='true'&&process.env.SAMPLES_VERIFIED==='true'&&process.env.CAREERS_VERIFIED==='true'&&process.env.MAIL_RECEIPTS_VERIFIED==='true'&&process.env.SITE_LIVE==='true'&&process.env.FORMS_ENABLED==='true'&&process.env.FORMS_VERIFIED==='true'&&legalReady();
let html=await readFile('public/index.html','utf8');
const stylesheet=await readFile('public/styles.css');
html=versionStylesheet(html,stylesheet);
html=versionNewsletterScripts(html,{'script.js':await readFile('public/script.js'),'integrations.js':await readFile('public/integrations.js')});
const preferences=await readFile('public/careers/preferences/index.html','utf8');
await writeFile('public/careers/preferences/index.html',preferences.replace('/styles.css"','/styles.css?v='+createHash('sha256').update(stylesheet).digest('hex').slice(0,12)+'"'));
if(live){html=html.replace('content="noindex, nofollow, noarchive"','content="index, follow"').replace('</head>','<link rel="canonical" href="https://cimstudio.es/"></head>');}
await writeFile('public/index.html',html);
await writeFile('public/robots.txt',live?'User-agent: *\nAllow: /\nSitemap: https://cimstudio.es/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
await writeFile('public/sitemap.xml',live?'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://cimstudio.es/</loc></url></urlset>':'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
