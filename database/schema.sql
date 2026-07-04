-- Astra database schema

-- PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users tracked by Discord ID, rating, and stats
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1500,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  winstreak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Queue entries for pickup sessions
CREATE TABLE IF NOT EXISTS queues (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1500,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'queued'
);

-- Matches and match metadata
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  creator_id TEXT,
  match_name TEXT,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Rating history and ELO change tracking
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  old_rating INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

-- Map pool and voting configuration
CREATE TABLE IF NOT EXISTS maps (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pool TEXT NOT NULL DEFAULT 'default',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seasons and season metadata
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'inactive',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Moderation and punishment records
CREATE TABLE IF NOT EXISTS punishments (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  moderator_id TEXT,
  type TEXT NOT NULL,
  reason TEXT,
  length_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Guild-specific configuration values
CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  queue_max_size INTEGER NOT NULL DEFAULT 10,
  default_player_rating INTEGER NOT NULL DEFAULT 1500,
  match_lifetime_seconds INTEGER NOT NULL DEFAULT 600,
  ready_timeout_seconds INTEGER NOT NULL DEFAULT 90,
  report_timeout_seconds INTEGER NOT NULL DEFAULT 1800,
  prefix TEXT NOT NULL DEFAULT '!',
  queue_type TEXT NOT NULL DEFAULT '2v2',
  ready_method TEXT NOT NULL DEFAULT 'button',
  match_counter INTEGER NOT NULL DEFAULT 0,
  two_v_two_channel_id TEXT,
  three_v_three_channel_id TEXT,
  four_v_four_channel_id TEXT,
  custom_queue_channel_id TEXT,
  results_channel_id TEXT,
  changable_results_for_admins BOOLEAN NOT NULL DEFAULT FALSE,
  admin_results_channel_id TEXT
);

-- Custom queue definitions
CREATE TABLE IF NOT EXISTS custom_queues (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  queue_name TEXT NOT NULL,
  queue_size INTEGER NOT NULL DEFAULT 10,
  channel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MVP voting records for matches
CREATE TABLE IF NOT EXISTS mvp_votes (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, voter_id)
);

-- Guild-level configuration values
CREATE TABLE IF NOT EXISTS configs (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, key)
);

-- Tournament subsystem tables
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'single',
  best_of INTEGER NOT NULL DEFAULT 1,
  organizer_id TEXT NOT NULL,
  channel_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  team_a_id INTEGER,
  team_b_id INTEGER,
  best_of INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  winner_team_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
