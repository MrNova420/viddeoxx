-- viddeoxx PostgreSQL schema
-- Run once: psql viddeoxx < api/schema.sql
-- Or applied automatically by FastAPI on startup

CREATE TABLE IF NOT EXISTS contacts (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    message   TEXT NOT NULL,
    reply_via TEXT DEFAULT '',
    created   BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS pageviews (
    path  TEXT NOT NULL,
    day   DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (path, day)
);

CREATE TABLE IF NOT EXISTS therapy_sessions (
    id         BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content    TEXT NOT NULL,
    model      TEXT DEFAULT '',
    created    BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_ts_session ON therapy_sessions(session_id, created);

CREATE TABLE IF NOT EXISTS perf_metrics (
    id         BIGSERIAL PRIMARY KEY,
    path       TEXT NOT NULL,
    load_time  INTEGER NOT NULL,
    ttfb       INTEGER,
    user_agent TEXT,
    timestamp  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_perf_path ON perf_metrics(path, timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_time ON perf_metrics(timestamp);

CREATE TABLE IF NOT EXISTS slayer_events (
    id        BIGSERIAL PRIMARY KEY,
    event     TEXT NOT NULL CHECK(event IN ('impression','click')),
    ad_id     TEXT NOT NULL,
    page      TEXT NOT NULL DEFAULT '/',
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_slayer_ad  ON slayer_events(ad_id, event);
CREATE INDEX IF NOT EXISTS idx_slayer_day ON slayer_events(timestamp, event);

-- ── Auth + Freemium ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT UNIQUE,
    password_hash TEXT,
    google_id     TEXT UNIQUE,
    name          TEXT NOT NULL DEFAULT 'User',
    avatar_url    TEXT DEFAULT '',
    plan          TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro')),
    created_at    BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);

CREATE TABLE IF NOT EXISTS user_sessions (
    token      TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_uid ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS chat_history (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    title      TEXT NOT NULL DEFAULT 'Chat Session',
    messages   JSONB NOT NULL DEFAULT '[]',
    model      TEXT DEFAULT '',
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_usage (
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day          DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes_used INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS anon_daily_usage (
    fingerprint  TEXT NOT NULL,
    day          DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes_used INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (fingerprint, day)
);
