-- Expenity API database (Cloudflare D1). Apply with: npm run db:remote   (local: npm run db:local)
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  lang           TEXT NOT NULL DEFAULT 'en',
  rev            INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

-- One row per passkey. id is the WebAuthn credential id (base64url); public_key is base64url COSE key.
CREATE TABLE IF NOT EXISTS credentials (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  public_key  TEXT NOT NULL,
  counter     INTEGER NOT NULL DEFAULT 0,
  multi       INTEGER NOT NULL DEFAULT 0,   -- a synced (multi-device) passkey: its counter is not a clone check
  transports  TEXT,
  label       TEXT NOT NULL DEFAULT 'Passkey',
  created_at  INTEGER NOT NULL,
  last_used   INTEGER
);
CREATE INDEX IF NOT EXISTS credentials_user ON credentials(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  agent       TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- Short-lived WebAuthn challenges (registration, sign-in, step-up, recovery). Single use.
CREATE TABLE IF NOT EXISTS challenges (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  user_id     TEXT,
  email       TEXT,
  lang        TEXT,
  challenge   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);

-- Recovery codes: stored hashed, single use.
CREATE TABLE IF NOT EXISTS recovery_codes (
  user_id    TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  used_at    INTEGER,
  PRIMARY KEY (user_id, code_hash)
);

-- Proof that a passkey was just used for a sensitive action (5 minutes, single use).
CREATE TABLE IF NOT EXISTS step_ups (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);

-- Email one-time codes (verification and recovery). Only used when email sending is enabled.
CREATE TABLE IF NOT EXISTS email_codes (
  user_id    TEXT NOT NULL,
  purpose    TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, purpose)
);

-- Test mail sink: written only when TEST_MODE is on, never in production.
CREATE TABLE IF NOT EXISTS outbox (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  to_addr   TEXT NOT NULL,
  subject   TEXT NOT NULL,
  body      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Everything the app syncs: bills, transactions, accounts, categories, budgets, goals and settings.
-- data is the JSON of the item; deleted rows are tombstones so deletions reach other devices.
CREATE TABLE IF NOT EXISTS records (
  user_id     TEXT NOT NULL,
  id          TEXT NOT NULL,
  kind        TEXT NOT NULL,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0,
  rev         INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS records_rev ON records(user_id, rev);

-- Daily exchange rates (ECB reference rates via a public API), cached here and served to the app. One row.
CREATE TABLE IF NOT EXISTS rates (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  fetched_at  INTEGER NOT NULL,
  rate_date   TEXT NOT NULL,
  data        TEXT NOT NULL
);

-- Shared wallets. A space holds the records of one shared wallet (the account, its transactions and bills) under the
-- owner key 'sp_' + id in the records table, with its own revision counter. Members have a role: owner, editor or viewer.
CREATE TABLE IF NOT EXISTS spaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    TEXT NOT NULL,
  rev         INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS space_members (
  space_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL,
  joined_at   INTEGER NOT NULL,
  PRIMARY KEY (space_id, user_id)
);
CREATE INDEX IF NOT EXISTS space_members_user ON space_members(user_id);
-- Invite codes are stored hashed; each is single use and expires.
CREATE TABLE IF NOT EXISTS space_invites (
  code_hash   TEXT PRIMARY KEY,
  space_id    TEXT NOT NULL,
  role        TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_by     TEXT,
  used_at     INTEGER
);
CREATE INDEX IF NOT EXISTS space_invites_space ON space_invites(space_id);

-- Web Push subscriptions (one per browser or installed app). last_day is the last local day a summary was sent.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint    TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  tz          TEXT NOT NULL DEFAULT 'UTC',
  hour        INTEGER NOT NULL DEFAULT 9,
  lang        TEXT NOT NULL DEFAULT 'en',
  last_day    TEXT,
  fails       INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  last_result TEXT,      -- what happened at the last pass: ok, fail, gone, nothing due
  last_status INTEGER,   -- the push service's HTTP code
  last_at     INTEGER,
  upd_ver     TEXT,                       -- the newest app version this device runs or was told about
  upd_off     INTEGER NOT NULL DEFAULT 0  -- 1 = the person turned off update notifications on this device
);
-- Existing databases: ALTER TABLE push_subs ADD COLUMN upd_ver TEXT; ALTER TABLE push_subs ADD COLUMN upd_off INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs(user_id);

-- Small re-encoded reference photos, separate from the lightweight sync records.
CREATE TABLE IF NOT EXISTS photos (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL,
 bytes INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_user ON photos(user_id);

-- Small tombstones prevent offline edits from restoring deleted photo references.
CREATE TABLE IF NOT EXISTS removed_photos (id TEXT PRIMARY KEY);

-- Anonymous usage statistics: one row per device per day (see usagePing in src/index.js). No account, email or IP address.
CREATE TABLE IF NOT EXISTS usage_daily (
  day      TEXT NOT NULL,
  device   TEXT NOT NULL,
  country  TEXT NOT NULL DEFAULT '',
  os       TEXT NOT NULL DEFAULT '',
  browser  TEXT NOT NULL DEFAULT '',
  lang     TEXT NOT NULL DEFAULT '',
  nlang    TEXT NOT NULL DEFAULT '',
  mode     TEXT NOT NULL DEFAULT '',
  cls      TEXT NOT NULL DEFAULT '',
  plan     TEXT NOT NULL DEFAULT '',
  skin     TEXT NOT NULL DEFAULT '',
  version  TEXT NOT NULL DEFAULT '',
  signed   INTEGER NOT NULL DEFAULT 0,
  chan     TEXT NOT NULL DEFAULT 'live',
  hits     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, device)
);
CREATE INDEX IF NOT EXISTS usage_device ON usage_daily(device);

-- Contact form: how many messages were accepted today (a daily cap, see contact() in src/index.js).
CREATE TABLE IF NOT EXISTS contact_daily (day TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
