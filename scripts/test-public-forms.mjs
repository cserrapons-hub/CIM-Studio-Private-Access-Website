// One CI entry point; child suites intercept all browser/provider requests.
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={...process.env,CHROMIUM_EXECUTABLE:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath()};
const suites=['test-form-bootstrap-isolation-browser.mjs','test-canonical-origin-browser.mjs','test-newsletter-public-browser.mjs','test-samples-response-browser.mjs','test-careers-response-modal-browser.mjs','test-turnstile-lifecycle-browser.mjs','test-career-confirmation-browser.mjs'];
for(const suite of suites){
 console.log(`\n=== ${suite} ===`);
 const result=spawnSync(process.execPath,['scripts/'+suite],{env,stdio:'inherit',timeout:240000});
 if(result.error||result.status!==0){console.error(`FAILED ${suite}`,result.error?.message||`exit ${result.status}`);process.exit(1);}
}
console.log('\nPASS all public form browser regression suites (mock services only).');
