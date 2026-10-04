CREATE TABLE IF NOT EXISTS gcm_keys (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 key_hash TEXT NOT NULL UNIQUE,
 key_hint TEXT NOT NULL,
 device_hash TEXT,
 device_label TEXT,
 blocked BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_login TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS gcm_sessions (
 token_hash TEXT PRIMARY KEY,
 role TEXT NOT NULL CHECK(role IN ('admin','student')),
 key_id TEXT REFERENCES gcm_keys(id) ON DELETE CASCADE,
 device_hash TEXT NOT NULL,
 admin_version TEXT,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS gcm_sessions_key_idx ON gcm_sessions(key_id);
CREATE TABLE IF NOT EXISTS gcm_limits (
 bucket TEXT PRIMARY KEY,
 hits INTEGER NOT NULL,
 until_at TIMESTAMPTZ NOT NULL
);
