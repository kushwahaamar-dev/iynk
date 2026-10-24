-- Continuous aggregates over events. Both are real-time (materialized_only = false):
-- a query reads the materialized buckets plus the raw rows newer than the last refresh,
-- so a lap flown a second ago is already on the board.

-- Best lap per course, pilot session and day. The leaderboard folds the days together,
-- and because the refresh window (3 days) sits well inside the 30-day retention, daily
-- bests outlive the raw laps.
CREATE MATERIALIZED VIEW IF NOT EXISTS laps_best_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  time_bucket(INTERVAL '1 day', ts)  AS day,
  data->>'course'                    AS course,
  session,
  coalesce(data->>'name', '')        AS name,
  min((data->>'timeMs')::numeric)    AS best_ms,
  count(*)                           AS laps
FROM events
WHERE kind = 'flight.lap'
  AND jsonb_typeof(data->'course') = 'string'
  AND jsonb_typeof(data->'timeMs') = 'number'
GROUP BY day, course, session, name
WITH NO DATA;

SELECT add_continuous_aggregate_policy('laps_best_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '15 minutes',
  if_not_exists     => true);

-- Activity per minute, kind and session. "events" counts rows; "units" adds up
-- data.count where an event stands for several (LED blinks are counted in batches).
-- Keeping session in the grouping makes "distinct builders in the last hour" a
-- query over a few thousand rolled-up rows instead of the raw 1 Hz flight samples.
CREATE MATERIALIZED VIEW IF NOT EXISTS activity_1m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  time_bucket(INTERVAL '1 minute', ts) AS bucket,
  kind,
  session,
  count(*) AS events,
  sum(CASE WHEN jsonb_typeof(data->'count') = 'number' THEN (data->>'count')::numeric ELSE 1 END) AS units
FROM events
GROUP BY bucket, kind, session
WITH NO DATA;

SELECT add_continuous_aggregate_policy('activity_1m',
  start_offset      => INTERVAL '2 hours',
  end_offset        => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists     => true);

-- The per-minute rollup is only read for the last hour; a week is plenty.
SELECT add_retention_policy('activity_1m', drop_after => INTERVAL '7 days', if_not_exists => true);
