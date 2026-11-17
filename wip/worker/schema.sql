-- Capybara Calm leaderboard (Cloudflare D1 / SQLite). Matches app/reports/v5.0/LEADERBOARD-OPTIONS.md.
-- Stores only: a client-generated random player id, an optional nickname, best world scores, timestamps,
-- and short-lived rate-limit counters keyed by a salted hash (never a raw IP).
CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,          -- client-generated UUID, stored in localStorage
  nickname      TEXT,                      -- optional, 2–16 visible characters after sanitising (NULL = "Anonymous capy")
  created_at    INTEGER NOT NULL,          -- unix ms
  opted_in_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS world_scores (
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  world         INTEGER NOT NULL CHECK (world BETWEEN 1 AND 5),
  score         INTEGER NOT NULL CHECK (score >= 0),
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (player_id, world)
);

CREATE INDEX IF NOT EXISTS world_scores_rank
  ON world_scores (world, score DESC, updated_at ASC);

-- Fixed-window rate limits. key = "<route>:<sha256(salt + ip or player id)>", window = unix minute (or hour).
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT NOT NULL,
  window        INTEGER NOT NULL,
  count         INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);

-- Consecutive campaign completion, independent of scoring (migrated saves may be unscored).
CREATE TABLE IF NOT EXISTS campaign_progress (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  last_cleared INTEGER NOT NULL DEFAULT 0 CHECK(last_cleared BETWEEN 0 AND 150)
);
