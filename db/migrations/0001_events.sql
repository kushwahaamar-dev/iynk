-- Telemetry events: one row per thing that happened in a lab (HX-CONTRACT H8).
-- A hypertable in 1-day chunks, segmented by kind in the columnstore, kept 30 days.
-- Every statement is safe to run again.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS events (
  ts      timestamptz NOT NULL,
  kind    text        NOT NULL,
  session text        NOT NULL,
  room    text,
  item    text,
  data    jsonb       NOT NULL DEFAULT '{}'::jsonb
) WITH (
  tsdb.hypertable,
  tsdb.partition_column = 'ts',
  tsdb.chunk_interval = '1 day',
  tsdb.segmentby = 'kind',
  tsdb.orderby = 'ts DESC'
);

-- The leaderboard's real-time tail and the live counters filter on kind and recent time.
CREATE INDEX IF NOT EXISTS events_kind_ts_idx ON events (kind, ts DESC);

-- Chunks move to the columnstore once they are a day old (TimescaleDB 2.23+ adds this
-- policy by itself; older 2.20-2.22 servers need it spelled out).
CALL add_columnstore_policy('events', after => INTERVAL '1 day', if_not_exists => true);

-- Raw events live 30 days. The continuous aggregates keep their rows after that.
SELECT add_retention_policy('events', drop_after => INTERVAL '30 days', if_not_exists => true);
