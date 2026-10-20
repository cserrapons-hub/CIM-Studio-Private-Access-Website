import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {newsletterTestEmailHash,authorisedNewsletterTestEmail,validNewsletterAllowlistSecret} from '../server/newsletter-test-allowlist.js';
test('allowlist matches PowerShell UTF-8 Base64-text key convention and normalises the email',async()=>{
 const secret=Buffer.alloc(32,7).toString('base64');
 const expected=createHmac('sha256',Buffer.from(secret,'utf8')).update('newsletter-test-allowlist:v1:owner@example.test','utf8').digest('hex');
 assert.equal(await newsletterTestEmailHash(secret,' Owner@Example.test '),expected);
 assert.notEqual(expected,createHmac('sha256',Buffer.from(secret,'base64')).update('newsletter-test-allowlist:v1:owner@example.test').digest('hex'));
 const env={NEWSLETTER_TEST_ALLOWLIST_SECRET:secret,NEWSLETTER_TEST_EMAIL_HASH:expected,AUDIT_HASH_SECRET:'test-only-independent-audit-secret'};
 assert.equal(await authorisedNewsletterTestEmail(env,' Owner@Example.test '),true);
 assert.equal(await authorisedNewsletterTestEmail(env,'other@example.test'),false);
 assert.equal(await authorisedNewsletterTestEmail({...env,NEWSLETTER_TEST_ALLOWLIST_SECRET:Buffer.alloc(32,8).toString('base64')},'owner@example.test'),false);
 for(const value of ['',undefined,'invalid',Buffer.alloc(16).toString('base64')])assert.equal(validNewsletterAllowlistSecret(value),false);
});
