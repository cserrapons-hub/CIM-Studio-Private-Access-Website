-- Apply to the existing FORMS_DB D1 database before enabling REFERRALS_ENABLED.
CREATE TABLE IF NOT EXISTS referral_owners (owner_hash TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, email_cipher TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS referral_access (token_hash TEXT PRIMARY KEY, owner_hash TEXT NOT NULL REFERENCES referral_owners(owner_hash), expires_at INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_referral_access_expiry ON referral_access(expires_at);
CREATE TABLE IF NOT EXISTS referral_signups (subject_hash TEXT PRIMARY KEY, owner_hash TEXT NOT NULL REFERENCES referral_owners(owner_hash), email_cipher TEXT NOT NULL, request_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','confirmed')), created_at TEXT NOT NULL, confirmed_at TEXT);
CREATE INDEX IF NOT EXISTS idx_referral_signups_owner ON referral_signups(owner_hash,status);
CREATE TABLE IF NOT EXISTS referral_coupons (coupon_id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, source_subject_hash TEXT NOT NULL REFERENCES referral_signups(subject_hash), kind TEXT NOT NULL CHECK(kind IN ('referrer','referred')), created_at TEXT NOT NULL, redeemed_at TEXT, UNIQUE(source_subject_hash,kind));
CREATE INDEX IF NOT EXISTS idx_referral_coupons_owner ON referral_coupons(owner_hash,redeemed_at);
CREATE INDEX IF NOT EXISTS idx_referral_signups_pending ON referral_signups(status,created_at);
CREATE TABLE IF NOT EXISTS referral_poll (
  subject_hash TEXT PRIMARY KEY REFERENCES referral_signups(subject_hash),
  next_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS referral_coupon_delivery (
  coupon_id TEXT PRIMARY KEY REFERENCES referral_coupons(coupon_id),
  delivered_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cajita_orders (
  id TEXT PRIMARY KEY,
  owner_hash TEXT,
  coupon_count INTEGER NOT NULL CHECK(coupon_count BETWEEN 0 AND 3),
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  live INTEGER NOT NULL CHECK(live IN (0,1)),
  origin TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  stripe_session TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','paid','expired'))
);
CREATE TABLE IF NOT EXISTS cajita_reservations (
  coupon_id TEXT PRIMARY KEY REFERENCES referral_coupons(coupon_id),
  order_id TEXT NOT NULL REFERENCES cajita_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_cajita_reservations_order ON cajita_reservations(order_id);
CREATE TABLE IF NOT EXISTS cajita_shipping_destinations (
  order_id TEXT PRIMARY KEY REFERENCES cajita_orders(id),
  address_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cajita_order_mail (
  order_id TEXT NOT NULL REFERENCES cajita_orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('studio','customer')),
  accepted_at TEXT NOT NULL,
  PRIMARY KEY(order_id,kind)
);
