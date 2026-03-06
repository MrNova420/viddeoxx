"""
Viddeoxx Chat — anonymous real-time WebSocket server.
Port :8001  (separate from main API :8000)
Zero tracking: no IPs, no emails, hashed-token sessions only.
"""
import asyncio, json, os, time, hashlib, re
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import chat_db as db

# ── Config ────────────────────────────────────────────────────────────────────
RATE_LIMIT_MSG   = int(os.environ.get("CHAT_RATE_MSG",   5))   # msgs per window
RATE_LIMIT_WIN   = int(os.environ.get("CHAT_RATE_WIN",   6))   # seconds
MAX_CONNECTIONS  = int(os.environ.get("CHAT_MAX_CONN",   500))
MAX_ROOM_CONNS   = int(os.environ.get("CHAT_MAX_ROOM",   200))
CLEANUP_INTERVAL = int(os.environ.get("CHAT_CLEANUP_MIN", 60)) # minutes
CORS_ORIGIN      = os.environ.get("DOMAIN", "*")
# Max new WS connections per IP per minute (DoS protection)
WS_CONN_RATE_PER_MIN = int(os.environ.get("CHAT_WS_CONN_RATE", 10))

# ── State ─────────────────────────────────────────────────────────────────────
# room_id -> set of WebSocket connections
connections: dict[str, set[WebSocket]] = defaultdict(set)
# session_hash -> [timestamps of recent messages]
rate_buckets: dict[str, list[float]] = defaultdict(list)
# ip_hash -> [timestamps of recent WS connects] — for connect-rate limiting
ws_connect_times: dict[str, list[float]] = defaultdict(list)
total_connections = 0

def _hash_ip(raw: str) -> str:
    return hashlib.blake2b(raw.encode(), digest_size=8).hexdigest()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    scheduler.add_job(cleanup_job, "interval", minutes=CLEANUP_INTERVAL)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)

async def cleanup_job():
    deleted = db.purge_expired()
    if deleted:
        print(f"[cleanup] purged {deleted} expired messages")


app = FastAPI(
    title="Innerflect chat",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"https://{CORS_ORIGIN}", "http://localhost:8090"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Strip server headers ──────────────────────────────────────────────────────
@app.middleware("http")
async def strip_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["server"] = "innerflect"
    try:
        del response.headers["x-powered-by"]
    except Exception:
        pass
    return response


# ── Rate limiter ──────────────────────────────────────────────────────────────
def check_rate(session_hash: str) -> bool:
    now = time.time()
    bucket = rate_buckets[session_hash]
    rate_buckets[session_hash] = [t for t in bucket if now - t < RATE_LIMIT_WIN]
    if len(rate_buckets[session_hash]) >= RATE_LIMIT_MSG:
        return False
    rate_buckets[session_hash].append(now)
    return True


# ── Pydantic models ───────────────────────────────────────────────────────────
CLEAN_RE = re.compile(r"[^\w\s\-_.!?@#$%^&*()+=\[\]{}|;:',.<>/?~`\"\\]", re.UNICODE)

def sanitize(s: str) -> str:
    return s.strip()[:db.MAX_MSG_LEN]

class SessionCreate(BaseModel):
    display_name: str
    color: str = "#a855f7"

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, v):
        v = v.strip()[:db.MAX_NAME_LEN]
        if not v:
            raise ValueError("name required")
        return v

    @field_validator("color")
    @classmethod
    def clean_color(cls, v):
        if not re.match(r"^#[0-9a-fA-F]{6}$", v):
            return "#a855f7"
        return v

class RoomCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "💬"

class ReactionPayload(BaseModel):
    msg_id: str
    emoji: str
    token: str

class NameChange(BaseModel):
    token: str
    new_name: str


# ── REST endpoints ─────────────────────────────────────────────────────────────

@app.get("/chat/api/health")
async def health():
    stats = db.db_stats()
    stats["online"] = total_connections
    return stats

@app.post("/chat/api/session")
async def new_session(body: SessionCreate):
    token = db.create_session(body.display_name, body.color)
    return {"token": token, "display_name": body.display_name, "color": body.color}

@app.get("/chat/api/rooms")
async def get_rooms():
    rooms = db.list_rooms()
    # attach online count per room
    for r in rooms:
        r["online"] = len(connections.get(r["id"], set()))
    return rooms

@app.post("/chat/api/rooms")
async def make_room(body: RoomCreate, request: Request):
    room = db.create_room(body.name.strip()[:32], body.description.strip()[:200], body.icon)
    if not room:
        raise HTTPException(409, "Room exists or limit reached")
    return room

@app.get("/chat/api/rooms/{room_id}/messages")
async def get_messages(room_id: str, limit: int = 50, before: Optional[int] = None):
    if not db.get_room(room_id):
        raise HTTPException(404, "Room not found")
    msgs = db.get_messages(room_id, min(limit, 100), before)
    return msgs

@app.post("/chat/api/react")
async def react(body: ReactionPayload):
    counts = db.add_reaction(body.msg_id, body.token, body.emoji)
    if counts is None:
        raise HTTPException(401, "Invalid session or message")
    # broadcast reaction update
    await broadcast(body.msg_id.split("-")[0] if "-" in body.msg_id else "", {
        "type": "reaction",
        "msg_id": body.msg_id,
        "reactions": counts,
    }, skip=None)
    return {"reactions": counts}

@app.post("/chat/api/rename")
async def rename(body: NameChange):
    ok = db.update_session_name(body.token, body.new_name.strip()[:db.MAX_NAME_LEN])
    if not ok:
        raise HTTPException(401, "Invalid session")
    return {"ok": True}

@app.get("/chat/api/stats")
async def stats():
    s = db.db_stats()
    s["online"] = total_connections
    s["rooms_active"] = sum(1 for v in connections.values() if v)
    return s


# ── WebSocket ─────────────────────────────────────────────────────────────────

async def broadcast(room_id: str, payload: dict, skip: Optional[WebSocket]):
    if room_id not in connections:
        return
    dead = set()
    msg = json.dumps(payload)
    for ws in list(connections[room_id]):
        if ws is skip:
            continue
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    connections[room_id] -= dead


@app.websocket("/ws/{room_id}")
async def ws_endpoint(ws: WebSocket, room_id: str, token: str = ""):
    global total_connections

    if not db.get_room(room_id):
        await ws.close(code=4004)
        return

    session = db.get_session(token) if token else None
    if not session:
        await ws.close(code=4001)
        return

    if total_connections >= MAX_CONNECTIONS or len(connections[room_id]) >= MAX_ROOM_CONNS:
        await ws.close(code=4008)
        return

    # Per-IP connection rate limit (prevent DoS via rapid reconnects)
    raw_ip = ws.client.host if ws.client else "unknown"
    ip_hash = _hash_ip(raw_ip)
    now = time.time()
    ws_connect_times[ip_hash] = [t for t in ws_connect_times[ip_hash] if now - t < 60]
    if len(ws_connect_times[ip_hash]) >= WS_CONN_RATE_PER_MIN:
        await ws.close(code=4029)
        return
    ws_connect_times[ip_hash].append(now)

    await ws.accept()
    connections[room_id].add(ws)
    total_connections += 1
    session_hash = session["token_hash"]

    # Announce join
    await broadcast(room_id, {
        "type": "presence",
        "action": "join",
        "display_name": session["display_name"],
        "color": session["color"],
        "online": len(connections[room_id]),
    }, skip=ws)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue

            kind = data.get("type", "message")

            if kind == "message":
                content = sanitize(data.get("content", ""))
                if not content:
                    continue
                if not check_rate(session_hash):
                    await ws.send_text(json.dumps({"type": "error", "msg": "Slow down!"}))
                    continue
                reply_to = data.get("reply_to")
                msg = db.post_message(room_id, token, content, reply_to)
                if msg:
                    msg["type"] = "message"
                    await broadcast(room_id, msg, skip=None)

            elif kind == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))

            elif kind == "typing":
                await broadcast(room_id, {
                    "type": "typing",
                    "display_name": session["display_name"],
                    "color": session["color"],
                }, skip=ws)

    except WebSocketDisconnect:
        pass
    finally:
        connections[room_id].discard(ws)
        total_connections = max(0, total_connections - 1)
        await broadcast(room_id, {
            "type": "presence",
            "action": "leave",
            "display_name": session["display_name"],
            "online": len(connections[room_id]),
        }, skip=None)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("CHAT_PORT", 8001))
    uvicorn.run("chat_server:app", host="127.0.0.1", port=port, reload=False)
