"""
Secure anonymous chat database layer.
- No emails, no IPs stored ever
- Session tokens stored as blake2b hashes only
- Messages have hard TTL (default 7 days, configurable)
- Auto-vacuum on startup
"""
import sqlite3
import hashlib
import secrets
import time
import os
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "chat.db")
MESSAGE_TTL_SECONDS = int(os.environ.get("CHAT_MSG_TTL", 7 * 86400))   # 7 days default
SESSION_TTL_SECONDS = int(os.environ.get("CHAT_SESSION_TTL", 30 * 86400))  # 30 days
MAX_ROOMS = int(os.environ.get("CHAT_MAX_ROOMS", 50))
MAX_MSG_LEN = 2000
MAX_NAME_LEN = 32
DEFAULT_ROOMS = [
    ("general",   "General chat",          "🏠"),
    ("random",    "Random stuff",           "🎲"),
    ("memes",     "Memes & funny content",  "😂"),
    ("tech",      "Tech talk",              "💻"),
    ("anonymous", "Fully anonymous drops",  "👤"),
]

# ── Thread-local persistent connection (WAL allows concurrent readers) ────────
_local = threading.local()

def _hash(value: str) -> str:
    return hashlib.blake2b(value.encode(), digest_size=16).hexdigest()


def get_db() -> sqlite3.Connection:
    """Return a per-thread persistent connection — avoids open/close overhead on every call."""
    if not hasattr(_local, "conn") or _local.conn is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA cache_size=-4000")
        conn.execute("PRAGMA temp_store=MEMORY")
        conn.execute("PRAGMA auto_vacuum=INCREMENTAL")
        _local.conn = conn
    return _local.conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS rooms (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            icon        TEXT NOT NULL DEFAULT '💬',
            created_at  INTEGER NOT NULL,
            pinned      INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
            id           TEXT PRIMARY KEY,
            room_id      TEXT NOT NULL,
            session_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            content      TEXT NOT NULL,
            reply_to     TEXT,
            reactions    TEXT NOT NULL DEFAULT '{}',
            created_at   INTEGER NOT NULL,
            expires_at   INTEGER NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token_hash   TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            color        TEXT NOT NULL DEFAULT '#a855f7',
            created_at   INTEGER NOT NULL,
            last_seen    INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_msg_room    ON messages(room_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_msg_expires ON messages(expires_at);
        CREATE INDEX IF NOT EXISTS idx_msg_session ON messages(session_hash);
    """)

    # Seed default rooms
    now = int(time.time())
    for slug, desc, icon in DEFAULT_ROOMS:
        conn.execute(
            "INSERT OR IGNORE INTO rooms (id, name, description, icon, created_at, pinned) VALUES (?,?,?,?,?,1)",
            (slug, slug, desc, icon, now)
        )
    conn.commit()


# ── Sessions ──────────────────────────────────────────────────────────────────

def create_session(display_name: str, color: str = "#a855f7") -> str:
    """Returns a raw token (sent to client once, never stored)."""
    raw = secrets.token_hex(32)
    h = _hash(raw)
    now = int(time.time())
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO sessions (token_hash, display_name, color, created_at, last_seen) VALUES (?,?,?,?,?)",
        (h, display_name[:MAX_NAME_LEN], color, now, now)
    )
    conn.commit()
    return raw


def get_session(raw_token: str) -> dict | None:
    h = _hash(raw_token)
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM sessions WHERE token_hash=?", (h,)
    ).fetchone()
    if row:
        conn.execute("UPDATE sessions SET last_seen=? WHERE token_hash=?", (int(time.time()), h))
        conn.commit()
    return dict(row) if row else None


def update_session_name(raw_token: str, new_name: str) -> bool:
    h = _hash(raw_token)
    conn = get_db()
    cur = conn.execute(
        "UPDATE sessions SET display_name=? WHERE token_hash=?",
        (new_name[:MAX_NAME_LEN], h)
    )
    conn.commit()
    return cur.rowcount > 0


# ── Rooms ─────────────────────────────────────────────────────────────────────

def list_rooms() -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT r.*, COUNT(m.id) as msg_count FROM rooms r "
        "LEFT JOIN messages m ON m.room_id=r.id AND m.expires_at > ? "
        "GROUP BY r.id ORDER BY r.pinned DESC, r.created_at ASC",
        (int(time.time()),)
    ).fetchall()
    return [dict(r) for r in rows]


def get_room(room_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM rooms WHERE id=?", (room_id,)).fetchone()
    return dict(row) if row else None


def create_room(name: str, description: str = "", icon: str = "💬") -> dict | None:
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
    if count >= MAX_ROOMS:
        return None
    slug = name.lower().replace(" ", "-")[:32]
    now = int(time.time())
    try:
        conn.execute(
            "INSERT INTO rooms (id, name, description, icon, created_at) VALUES (?,?,?,?,?)",
            (slug, slug, description[:200], icon, now)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM rooms WHERE id=?", (slug,)).fetchone()
        return dict(row)
    except sqlite3.IntegrityError:
        return None


# ── Messages ──────────────────────────────────────────────────────────────────

def post_message(room_id: str, raw_token: str, content: str, reply_to: str | None = None) -> dict | None:
    if not content or len(content) > MAX_MSG_LEN:
        return None
    h = _hash(raw_token)
    conn = get_db()
    # Single connection: validate session + room + insert atomically
    session_row = conn.execute(
        "SELECT token_hash, display_name, color FROM sessions WHERE token_hash=?", (h,)
    ).fetchone()
    if not session_row:
        return None
    room_row = conn.execute("SELECT id FROM rooms WHERE id=?", (room_id,)).fetchone()
    if not room_row:
        return None

    msg_id = secrets.token_hex(8)
    now    = int(time.time())
    expires = now + MESSAGE_TTL_SECONDS
    conn.execute(
        "INSERT INTO messages (id, room_id, session_hash, display_name, content, reply_to, created_at, expires_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (msg_id, room_id, session_row["token_hash"], session_row["display_name"], content, reply_to, now, expires)
    )
    conn.execute("UPDATE sessions SET last_seen=? WHERE token_hash=?", (now, h))
    conn.commit()
    return {
        "id":           msg_id,
        "room_id":      room_id,
        "display_name": session_row["display_name"],
        "color":        session_row["color"],
        "content":      content,
        "reply_to":     reply_to,
        "reactions":    {},
        "created_at":   now,
    }


def get_messages(room_id: str, limit: int = 50, before_ts: int | None = None) -> list[dict]:
    now = int(time.time())
    conn = get_db()
    if before_ts:
        rows = conn.execute(
            "SELECT m.*, s.color FROM messages m "
            "LEFT JOIN sessions s ON s.token_hash=m.session_hash "
            "WHERE m.room_id=? AND m.expires_at>? AND m.created_at<? "
            "ORDER BY m.created_at DESC LIMIT ?",
            (room_id, now, before_ts, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT m.*, s.color FROM messages m "
            "LEFT JOIN sessions s ON s.token_hash=m.session_hash "
            "WHERE m.room_id=? AND m.expires_at>? "
            "ORDER BY m.created_at DESC LIMIT ?",
            (room_id, now, limit)
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def add_reaction(msg_id: str, raw_token: str, emoji: str) -> dict | None:
    import json
    session = get_session(raw_token)
    if not session:
        return None
    conn = get_db()
    row = conn.execute("SELECT reactions FROM messages WHERE id=?", (msg_id,)).fetchone()
    if not row:
        return None
    reactions = json.loads(row["reactions"] or "{}")
    h = session["token_hash"]
    if emoji not in reactions:
        reactions[emoji] = []
    if h in reactions[emoji]:
        reactions[emoji].remove(h)      # toggle off
    else:
        reactions[emoji].append(h)
    if not reactions[emoji]:
        del reactions[emoji]
    conn.execute("UPDATE messages SET reactions=? WHERE id=?", (json.dumps(reactions), msg_id))
    conn.commit()
    # Return counts only (hashes never sent to client)
    return {k: len(v) for k, v in reactions.items()}


# ── Cleanup ───────────────────────────────────────────────────────────────────

def purge_expired(max_delete: int = 5000) -> int:
    now = int(time.time())
    conn = get_db()
    cur = conn.execute(
        "DELETE FROM messages WHERE expires_at <= ? AND id IN "
        "(SELECT id FROM messages WHERE expires_at <= ? LIMIT ?)",
        (now, now, max_delete)
    )
    deleted = cur.rowcount
    # purge stale sessions
    conn.execute(
        "DELETE FROM sessions WHERE last_seen < ?",
        (now - SESSION_TTL_SECONDS,)
    )
    conn.execute("PRAGMA incremental_vacuum(100)")
    conn.commit()
    return deleted


def db_stats() -> dict:
    conn = get_db()
    msgs = conn.execute("SELECT COUNT(*) FROM messages WHERE expires_at > ?", (int(time.time()),)).fetchone()[0]
    sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
    rooms = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
    size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    return {"messages": msgs, "sessions": sessions, "rooms": rooms, "db_bytes": size}
