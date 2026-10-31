-- usage differs from the architecture document on purpose: device_id carries
-- ON DELETE CASCADE so deleting a device removes its counters.
CREATE TABLE usage (
  day TEXT NOT NULL,
  provider TEXT NOT NULL,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  requests INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  searches INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, provider, device_id)
) WITHOUT ROWID;
CREATE INDEX usage_by_device ON usage(device_id);

CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'mcp')),
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  token_hash BLOB NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER
);
