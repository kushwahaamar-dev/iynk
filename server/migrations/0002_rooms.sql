CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  creator_device TEXT NOT NULL REFERENCES devices(id),
  host_actor TEXT NOT NULL,
  baton_actor TEXT,
  runner_actor TEXT,
  state TEXT NOT NULL CHECK (state IN ('open', 'locked', 'idle', 'closed', 'corrupt')),
  epoch TEXT NOT NULL,
  seq INTEGER NOT NULL,
  chain TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  opschema TEXT NOT NULL,
  settings TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE INDEX rooms_by_state ON rooms(state, last_active_at);
CREATE INDEX rooms_by_creator ON rooms(creator_device);

CREATE TABLE room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
  spectator INTEGER NOT NULL DEFAULT 0,
  muted INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, device_id)
);
CREATE INDEX room_members_by_device ON room_members(device_id);

CREATE TABLE room_invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  creator TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  secret_hash BLOB NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('direct', 'link')),
  role TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')),
  max_uses INTEGER NOT NULL CHECK (max_uses BETWEEN 1 AND 20),
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  target_device TEXT REFERENCES devices(id) ON DELETE CASCADE
);
CREATE INDEX room_invites_by_room ON room_invites(room_id);

CREATE TABLE ops (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  env BLOB,
  author_actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  target TEXT,
  at INTEGER NOT NULL,
  chain TEXT NOT NULL,
  PRIMARY KEY (room_id, seq)
) WITHOUT ROWID;

CREATE TABLE checkpoints (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  state_hash TEXT NOT NULL,
  chain TEXT NOT NULL,
  doc BLOB NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('auto', 'named', 'genesis')),
  PRIMARY KEY (room_id, seq)
) WITHOUT ROWID;

CREATE TABLE submissions (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  first_op_id TEXT NOT NULL,
  seq0 INTEGER NOT NULL,
  seq1 INTEGER NOT NULL,
  inverse TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (room_id, device_id, first_op_id)
) WITHOUT ROWID;

CREATE TABLE events (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  n INTEGER NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  actor TEXT,
  data TEXT NOT NULL,
  PRIMARY KEY (room_id, n)
) WITHOUT ROWID;

CREATE TABLE blobs (
  sha256 BLOB PRIMARY KEY,
  bytes BLOB NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE uploads (
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sha256 BLOB NOT NULL REFERENCES blobs(sha256),
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (device_id, sha256)
) WITHOUT ROWID;
