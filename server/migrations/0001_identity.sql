CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  public_key BLOB NOT NULL,
  thumbprint TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 24),
  server_role TEXT NOT NULL CHECK (server_role IN ('owner', 'member')),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER,
  color TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  show_online INTEGER NOT NULL DEFAULT 1,
  show_activity INTEGER NOT NULL DEFAULT 0,
  deletion_requested_at INTEGER,
  deletion_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  token_hash BLOB NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_used_at INTEGER NOT NULL,
  client TEXT
);
CREATE INDEX sessions_by_device ON sessions(device_id);
CREATE INDEX sessions_by_expiry ON sessions(expires_at);

CREATE TABLE enrollment_codes (
  id TEXT PRIMARY KEY,
  secret_hash BLOB NOT NULL,
  typed_hash BLOB NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_by TEXT REFERENCES devices(id) ON DELETE SET NULL,
  used_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX enrollment_codes_by_expiry ON enrollment_codes(expires_at);

CREATE TABLE pairings (
  id TEXT PRIMARY KEY,
  creator TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  token_hash BLOB UNIQUE,
  channel TEXT UNIQUE,
  code_hash BLOB UNIQUE,
  label TEXT,
  grant_project TEXT,
  grant_role TEXT CHECK (grant_role IN ('editor', 'commenter', 'viewer')),
  expires_at INTEGER NOT NULL,
  code_expires_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  revoked_at INTEGER,
  used_by TEXT REFERENCES devices(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX pairings_by_creator ON pairings(creator);

CREATE TABLE buddies (
  a TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  b TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  since INTEGER NOT NULL,
  alias_a TEXT,
  alias_b TEXT,
  PRIMARY KEY (a, b),
  CHECK (a < b)
);
CREATE INDEX buddies_by_b ON buddies(b);
