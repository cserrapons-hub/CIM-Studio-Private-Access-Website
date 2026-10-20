// Server-only test-email authorisation. Never use this key for evidence or rate limits.
import {hash} from './forms.js';
export function validNewsletterAllowlistSecret(secret){
 if(typeof secret!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(secret))return false;
 try{return atob(secret).length===32;}catch{return false;}
}
export async function newsletterTestEmailHash(secret,email){
 if(!validNewsletterAllowlistSecret(secret)||typeof email!=='string')throw Error('invalid_test_allowlist');
 // The Base64 TEXT is the UTF-8 HMAC key, matching the PowerShell 5.1 instructions.
 // Do not decode it into bytes before computing HMAC.
 return hash(secret,'newsletter-test-allowlist:v1:'+email.trim().toLowerCase());
}
export async function authorisedNewsletterTestEmail(env,email){
 if(!validNewsletterAllowlistSecret(env.NEWSLETTER_TEST_ALLOWLIST_SECRET)||env.NEWSLETTER_TEST_ALLOWLIST_SECRET===env.AUDIT_HASH_SECRET||typeof env.NEWSLETTER_TEST_EMAIL_HASH!=='string'||!/^[a-f0-9]{64}$/.test(env.NEWSLETTER_TEST_EMAIL_HASH))return false;
 const expected=await newsletterTestEmailHash(env.NEWSLETTER_TEST_ALLOWLIST_SECRET,email);
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^env.NEWSLETTER_TEST_EMAIL_HASH.charCodeAt(i);
 return mismatch===0;
}
