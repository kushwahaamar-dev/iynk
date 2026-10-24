-- The buddy pool: opt-in profiles for /api/ai/match. A plain relational table next to
-- the events hypertable. No contact data; a profile disappears 24 hours after its last
-- update. Reads filter on expires_at, and a TimescaleDB job deletes the expired rows.

CREATE TABLE IF NOT EXISTS profiles (
  id         text        PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{8,64}$'),
  token_hash bytea       NOT NULL,
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 24),
  lang       text        NOT NULL CHECK (lang IN ('en', 'es', 'fr', 'de', 'zh', 'hi')),
  interests  text[]      NOT NULL DEFAULT '{}' CHECK (cardinality(interests) <= 12),
  built      text[]      NOT NULL DEFAULT '{}' CHECK (cardinality(built) <= 64),
  wants      text        NOT NULL DEFAULT '' CHECK (char_length(wants) <= 280),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS profiles_expires_at_idx ON profiles (expires_at);

CREATE OR REPLACE PROCEDURE simlab_expire_profiles(job_id int, config jsonb)
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM profiles WHERE expires_at <= now();
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.jobs WHERE proc_name = 'simlab_expire_profiles'
  ) THEN
    PERFORM add_job('simlab_expire_profiles', INTERVAL '15 minutes');
  END IF;
END
$$;
