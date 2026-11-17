-- Apply to the existing FORMS_DB D1 database before enabling REFERRALS_ENABLED.
CREATE TABLE IF NOT EXISTS referral_owners (owner_hash TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, email_cipher TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS referral_access (token_hash TEXT PRIMARY KEY, owner_hash TEXT NOT NULL REFERENCES referral_owners(owner_hash), expires_at INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_referral_access_expiry ON referral_access(expires_at);
CREATE TABLE IF NOT EXISTS referral_signups (subject_hash TEXT PRIMARY KEY, owner_hash TEXT NOT NULL REFERENCES referral_owners(owner_hash), email_cipher TEXT NOT NULL, request_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','confirmed')), created_at TEXT NOT NULL, confirmed_at TEXT);
CREATE INDEX IF NOT EXISTS idx_referral_signups_owner ON referral_signups(owner_hash,status);
CREATE TABLE IF NOT EXISTS referral_coupons (coupon_id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, source_subject_hash TEXT NOT NULL REFERENCES referral_signups(subject_hash), kind TEXT NOT NULL CHECK(kind IN ('referrer','referred')), created_at TEXT NOT NULL, redeemed_at TEXT, UNIQUE(source_subject_hash,kind));
CREATE INDEX IF NOT EXISTS idx_referral_coupons_owner ON referral_coupons(owner_hash,redeemed_at);
