CREATE TABLE scores (
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('ms', 's', 'points', 'count')),
  better TEXT NOT NULL CHECK (better IN ('lower', 'higher')),
  at INTEGER NOT NULL,
  project_id TEXT,
  note TEXT,
  PRIMARY KEY (device_id, key)
);
CREATE INDEX scores_by_key ON scores(key);
