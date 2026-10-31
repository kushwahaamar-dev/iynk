CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  token_hash BLOB NOT NULL UNIQUE,
  owner TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  doc BLOB NOT NULL,
  state_hash TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('link', 'buddies')),
  allow_fork INTEGER NOT NULL,
  label TEXT,
  revision INTEGER NOT NULL,
  opens INTEGER NOT NULL DEFAULT 0,
  last_opened_at INTEGER
);
CREATE INDEX shares_by_owner ON shares(owner, created_at, id);

CREATE TABLE share_blobs (
  share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  sha256 BLOB NOT NULL REFERENCES blobs(sha256),
  PRIMARY KEY (share_id, sha256)
) WITHOUT ROWID;
CREATE INDEX share_blobs_by_blob ON share_blobs(sha256);
