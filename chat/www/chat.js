/**
 * Viddeoxx Chat Client
 * Anonymous WebSocket chat — no cookies, no storage of sensitive data
 * Session token stored in sessionStorage only (cleared when tab closes)
 */

const CHAT_API   = "/chat/api";
const WS_BASE    = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
const TOKEN_KEY  = "vx_chat_token";
const NAME_KEY   = "vx_chat_name";
const COLOR_KEY  = "vx_chat_color";
const EMOJI_SET  = ["👍","❤️","😂","😮","😢","🔥","💯","👀"];

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  token:        sessionStorage.getItem(TOKEN_KEY) || null,
  displayName:  sessionStorage.getItem(NAME_KEY)  || "Anonymous",
  color:        sessionStorage.getItem(COLOR_KEY)  || "#a855f7",
  currentRoom:  null,
  ws:           null,
  rooms:        [],
  oldestTs:     null,
  typingTimer:  null,
  typingUsers:  new Map(),   // name -> clearTimeout handle
  pendingReply: null,
  reconnectAttempts: 0,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className=cls; if(html!==undefined) e.innerHTML=html; return e; };

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupOnboarding();
  setupModals();
  setupInputBar();
  setupSidebarToggle();
  setupNetworkMonitoring();
  if (state.token) {
    showApp();
  }
});

function setupNetworkMonitoring() {
  // Auto-reconnect when network comes back online (mobile)
  window.addEventListener("online", () => {
    if (state.currentRoom && (!state.ws || state.ws.readyState !== WebSocket.OPEN)) {
      state.reconnectAttempts = 0;
      connectWS(state.currentRoom);
    }
  });
}

function setupOnboarding() {
  // Color picker
  document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.color = btn.dataset.color;
    });
  });

  $("btn-enter-chat").addEventListener("click", enterChat);
  $("input-display-name").addEventListener("keydown", e => { if(e.key==="Enter") enterChat(); });

  // Icon picker for new room modal
  document.querySelectorAll(".icon-opt").forEach(opt => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".icon-opt").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
    });
  });
}

async function enterChat() {
  const nameInput = $("input-display-name");
  const name = nameInput.value.trim() || `anon_${Math.random().toString(36).slice(2,6)}`;
  nameInput.value = name;

  try {
    const res = await fetch(`${CHAT_API}/session`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ display_name: name, color: state.color })
    });
    if (!res.ok) throw new Error("Session failed");
    const data = await res.json();
    state.token       = data.token;
    state.displayName = data.display_name;
    state.color       = data.color;
    sessionStorage.setItem(TOKEN_KEY, state.token);
    sessionStorage.setItem(NAME_KEY,  state.displayName);
    sessionStorage.setItem(COLOR_KEY, state.color);
    showApp();
  } catch (err) {
    nameInput.style.borderColor = "#ef4444";
    setTimeout(() => nameInput.style.borderColor = "", 1500);
  }
}

function showApp() {
  $("modal-onboard").style.display = "none";
  $("chat-app").style.display      = "flex";
  $("user-name-display").textContent = state.displayName;
  $("user-dot").style.background = state.color;
  loadRooms();
}

// ── Rooms ──────────────────────────────────────────────────────────────────
async function loadRooms() {
  try {
    const res = await fetch(`${CHAT_API}/rooms`);
    state.rooms = await res.json();
    renderRoomList();
    if (state.rooms.length && !state.currentRoom) {
      joinRoom(state.rooms[0].id);
    }
  } catch(e) {
    console.error("Failed to load rooms", e);
  }
}

function renderRoomList() {
  const list = $("room-list");
  list.innerHTML = "";
  state.rooms.forEach(room => {
    const li = el("li", "room-item" + (room.id === state.currentRoom ? " active" : ""));
    li.innerHTML = `
      <span class="room-icon">${room.icon}</span>
      <span class="room-label">${escHtml(room.name)}</span>
      <span class="room-online-badge">${room.online || 0}</span>
    `;
    li.dataset.roomId = room.id;
    li.addEventListener("click", () => joinRoom(room.id));
    list.appendChild(li);
  });
}

async function joinRoom(roomId) {
  if (state.currentRoom === roomId && state.ws?.readyState === WebSocket.OPEN) return;

  // Interstitial ad on room switch (after first join)
  if (state.currentRoom !== null) {
    injectInterstitialAd();
  }

  state.currentRoom = roomId;
  state.oldestTs    = null;
  state.pendingReply = null;

  // Update sidebar active state
  renderRoomList();

  // Update header
  const room = state.rooms.find(r => r.id === roomId);
  if (room) {
    $("room-icon").textContent        = room.icon;
    $("room-name-header").textContent = `#${room.name}`;
    $("room-desc-header").textContent = room.description;
    $("msg-input").placeholder        = `Message #${room.name}… (anonymous)`;
  }

  // Close old WS
  if (state.ws) {
    state.ws.onclose = null;
    state.ws.close();
    state.ws = null;
  }

  // Clear feed
  $("msg-list").innerHTML = "";
  $("chat-input-bar").style.display = "block";
  hideReplyPreview();

  // Load history
  await loadHistory(roomId);

  // Open WS
  connectWS(roomId);
}

async function loadHistory(roomId, before = null) {
  try {
    let url = `${CHAT_API}/rooms/${roomId}/messages?limit=50`;
    if (before) url += `&before=${before}`;
    const res = await fetch(url);
    const msgs = await res.json();
    if (msgs.length) {
      state.oldestTs = msgs[0].created_at;
      renderMessages(msgs, before ? "prepend" : "replace");
      $("load-more-wrap").style.display = msgs.length >= 50 ? "block" : "none";
    } else {
      if (!before) renderWelcomeState();
      $("load-more-wrap").style.display = "none";
    }
    if (!before) scrollToBottom();
  } catch(e) { console.error("loadHistory", e); }
}

$("btn-load-more").addEventListener("click", () => {
  if (state.currentRoom && state.oldestTs) {
    loadHistory(state.currentRoom, state.oldestTs);
  }
});

// ── WebSocket ──────────────────────────────────────────────────────────────
function connectWS(roomId) {
  const url = `${WS_BASE}/${roomId}?token=${encodeURIComponent(state.token)}`;
  const ws  = new WebSocket(url);
  state.ws  = ws;

  ws.onopen = () => {
    state.reconnectAttempts = 0;
    startPingLoop(ws);
  };

  ws.onmessage = ({ data }) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    handleWsMessage(msg);
  };

  ws.onclose = () => {
    stopPingLoop();
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
    state.reconnectAttempts++;
    setTimeout(() => {
      if (state.currentRoom === roomId) connectWS(roomId);
    }, delay);
  };

  ws.onerror = () => ws.close();
}

let pingInterval = null;
function startPingLoop(ws) {
  stopPingLoop();
  pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:"ping"}));
  }, 25000);
}
function stopPingLoop() { if (pingInterval) { clearInterval(pingInterval); pingInterval = null; } }

function handleWsMessage(msg) {
  switch (msg.type) {
    case "message":
      appendMessage(msg);
      scrollIfNearBottom();
      break;
    case "presence":
      updateOnlineCount(msg.online);
      if (msg.action) {
        appendSystemMsg(`${escHtml(msg.display_name)} ${msg.action === "join" ? "joined" : "left"} the room`);
      }
      break;
    case "typing":
      showTypingIndicator(msg.display_name);
      break;
    case "reaction":
      updateReactions(msg.msg_id, msg.reactions);
      break;
    case "error":
      flashError(msg.msg);
      break;
  }
}

// ── Messages ───────────────────────────────────────────────────────────────
function renderMessages(msgs, mode = "replace") {
  const list = $("msg-list");
  if (mode === "replace") {
    list.innerHTML = "";
    msgs.forEach(m => list.appendChild(buildMsgEl(m)));
  } else {
    // prepend (older messages)
    const frag = document.createDocumentFragment();
    msgs.forEach(m => frag.appendChild(buildMsgEl(m)));
    list.insertBefore(frag, list.firstChild);
  }
}

function appendMessage(msg) {
  $("msg-list").appendChild(buildMsgEl(msg));
}

function buildMsgEl(msg) {
  const wrap = el("div", "msg-bubble");
  wrap.dataset.msgId = msg.id;

  // Avatar
  const avatar = el("div", "msg-avatar");
  avatar.style.background = msg.color || "#a855f7";
  avatar.style.color = "#fff";
  avatar.textContent = (msg.display_name || "?")[0];
  wrap.appendChild(avatar);

  // Body
  const body = el("div", "msg-body");

  // Reply ref
  if (msg.reply_to) {
    const ref = el("div", "msg-reply-ref", `↩ replying to a message`);
    body.appendChild(ref);
  }

  // Meta
  const meta = el("div", "msg-meta");
  const name = el("span", "msg-name", escHtml(msg.display_name || "anon"));
  name.style.color = msg.color || "#a855f7";
  const ts = el("span", "msg-time", formatTime(msg.created_at));
  meta.appendChild(name);
  meta.appendChild(ts);
  body.appendChild(meta);

  // Content
  const content = el("div", "msg-content", escHtml(msg.content));
  body.appendChild(content);

  // Reactions
  const reactRow = el("div", "msg-reactions");
  reactRow.dataset.msgId = msg.id;
  const reactions = (typeof msg.reactions === "string") ? JSON.parse(msg.reactions || "{}") : (msg.reactions || {});
  Object.entries(reactions).forEach(([emoji, count]) => {
    if (count > 0) reactRow.appendChild(buildReactionPill(msg.id, emoji, count));
  });
  body.appendChild(reactRow);

  wrap.appendChild(body);

  // Hover actions
  const actions = el("div", "msg-actions");
  EMOJI_SET.slice(0,4).forEach(emoji => {
    const btn = el("button", "msg-act-btn", emoji);
    btn.title = `React with ${emoji}`;
    btn.addEventListener("click", () => sendReaction(msg.id, emoji));
    actions.appendChild(btn);
  });
  const replyBtn = el("button", "msg-act-btn", "↩");
  replyBtn.title = "Reply";
  replyBtn.addEventListener("click", () => setReplyTo(msg.id, msg.display_name, msg.content));
  actions.appendChild(replyBtn);
  wrap.appendChild(actions);

  return wrap;
}

function appendSystemMsg(text) {
  const div = el("div", "msg-system", text);
  $("msg-list").appendChild(div);
  scrollIfNearBottom();
}

function renderWelcomeState() {
  $("msg-list").innerHTML = "";
  const ws = el("div", "welcome-state");
  ws.innerHTML = `<div class="big-icon">👋</div><p>No messages yet. Say something!</p>`;
  $("msg-list").appendChild(ws);
}

// ── Reactions ──────────────────────────────────────────────────────────────
function buildReactionPill(msgId, emoji, count) {
  const pill = el("span", "reaction-pill", `${emoji} ${count}`);
  pill.dataset.emoji = emoji;
  pill.addEventListener("click", () => sendReaction(msgId, emoji));
  return pill;
}

async function sendReaction(msgId, emoji) {
  try {
    await fetch(`${CHAT_API}/react`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ msg_id: msgId, emoji, token: state.token })
    });
  } catch(e) {}
}

function updateReactions(msgId, reactions) {
  const row = document.querySelector(`.msg-reactions[data-msg-id="${msgId}"]`);
  if (!row) return;
  row.innerHTML = "";
  Object.entries(reactions).forEach(([emoji, count]) => {
    if (count > 0) row.appendChild(buildReactionPill(msgId, emoji, count));
  });
}

// ── Input / Send ───────────────────────────────────────────────────────────
function setupInputBar() {
  const input   = $("msg-input");
  const sendBtn = $("btn-send");
  const charCnt = $("char-count");

  input.addEventListener("input", () => {
    // Auto-resize
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
    // Char count
    const len = input.value.length;
    charCnt.textContent = `${len}/2000`;
    charCnt.className = "char-count" + (len > 1900 ? " at-limit" : len > 1600 ? " near-limit" : "");
    // Typing indicator
    sendTypingSignal();
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);
  $("btn-cancel-reply").addEventListener("click", hideReplyPreview);
  $("btn-rename").addEventListener("click", promptRename);
}

let typingSent = false;
function sendTypingSignal() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  if (!typingSent) {
    state.ws.send(JSON.stringify({type:"typing"}));
    typingSent = true;
    setTimeout(() => { typingSent = false; }, 3000);
  }
}

function sendMessage() {
  const input   = $("msg-input");
  const content = input.value.trim();
  if (!content || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  const payload = { type: "message", content };
  if (state.pendingReply) {
    payload.reply_to = state.pendingReply.id;
  }

  state.ws.send(JSON.stringify(payload));
  input.value = "";
  input.style.height = "auto";
  $("char-count").textContent = "0/2000";
  hideReplyPreview();

  // Remove welcome state if present
  const ws = $("msg-list").querySelector(".welcome-state");
  if (ws) ws.remove();
}

function setReplyTo(msgId, name, content) {
  state.pendingReply = { id: msgId };
  $("reply-text").textContent = `↩ ${name}: ${content.slice(0, 60)}${content.length > 60 ? "…" : ""}`;
  $("reply-preview").style.display = "flex";
  $("msg-input").focus();
}
function hideReplyPreview() {
  state.pendingReply = null;
  $("reply-preview").style.display = "none";
}

async function promptRename() {
  const newName = prompt("New display name:", state.displayName);
  if (!newName?.trim()) return;
  try {
    const res = await fetch(`${CHAT_API}/rename`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ token: state.token, new_name: newName.trim() })
    });
    if (res.ok) {
      state.displayName = newName.trim();
      sessionStorage.setItem(NAME_KEY, state.displayName);
      $("user-name-display").textContent = state.displayName;
    }
  } catch(e) {}
}

// ── Typing indicator ───────────────────────────────────────────────────────
function showTypingIndicator(name) {
  const existing = state.typingUsers.get(name);
  if (existing) clearTimeout(existing);
  const handle = setTimeout(() => {
    state.typingUsers.delete(name);
    refreshTypingDisplay();
  }, 3500);
  state.typingUsers.set(name, handle);
  refreshTypingDisplay();
}

function refreshTypingDisplay() {
  const names = [...state.typingUsers.keys()];
  if (!names.length) {
    $("typing-indicator").style.display = "none";
    return;
  }
  $("typing-indicator").style.display = "flex";
  const text = names.length === 1
    ? `${escHtml(names[0])} is typing`
    : `${names.slice(0,-1).map(escHtml).join(", ")} and ${escHtml(names.at(-1))} are typing`;
  $("typing-text").textContent = text;
}

// ── Modals ─────────────────────────────────────────────────────────────────
function setupModals() {
  $("btn-new-room").addEventListener("click", () => {
    $("modal-new-room").style.display = "flex";
    $("input-room-name").focus();
  });
  $("btn-cancel-room").addEventListener("click", () => {
    $("modal-new-room").style.display = "none";
  });
  $("btn-create-room").addEventListener("click", createRoom);
  $("modal-new-room").addEventListener("click", e => {
    if (e.target === $("modal-new-room")) $("modal-new-room").style.display = "none";
  });
}

async function createRoom() {
  const name = $("input-room-name").value.trim();
  if (!name) return;
  const icon = document.querySelector(".icon-opt.active")?.textContent || "💬";
  const desc = $("input-room-desc").value.trim();
  try {
    const res = await fetch(`${CHAT_API}/rooms`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, description: desc, icon })
    });
    if (res.ok) {
      $("modal-new-room").style.display = "none";
      $("input-room-name").value = "";
      $("input-room-desc").value = "";
      await loadRooms();
      joinRoom(name.toLowerCase().replace(/ /g, "-").slice(0, 32));
    } else {
      $("input-room-name").style.borderColor = "#ef4444";
      setTimeout(() => $("input-room-name").style.borderColor = "", 1500);
    }
  } catch(e) {}
}

// ── Sidebar toggle (mobile) ────────────────────────────────────────────────
function setupSidebarToggle() {
  $("btn-sidebar-toggle").addEventListener("click", () => {
    $("chat-sidebar").classList.toggle("open");
  });
  $("room-list").addEventListener("click", () => {
    if (window.innerWidth <= 600) $("chat-sidebar").classList.remove("open");
  });
}

// ── Ads integration ────────────────────────────────────────────────────────
function injectInterstitialAd() {
  // Fires between room switches — a small interstitial moment
  // The slayer.js handles the actual ad rendering via ads.json config
  if (window.__slayer && typeof window.__slayer.triggerInterstitial === "function") {
    window.__slayer.triggerInterstitial();
  } else {
    // Fallback: show popup ad slot briefly
    const popup = $("chat-ad-popup");
    if (popup && popup.innerHTML.trim()) {
      popup.style.display = "block";
      setTimeout(() => { popup.style.display = "none"; }, 4000);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function updateOnlineCount(n) {
  $("online-count").textContent = `${n} online`;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const feed = $("msg-feed");
    feed.scrollTop = feed.scrollHeight;
  });
}

function scrollIfNearBottom() {
  const feed = $("msg-feed");
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
  if (nearBottom) scrollToBottom();
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function formatTime(unix) {
  const d = new Date(unix * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString([], {month:"short",day:"numeric"}) +
         " " + d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}

function flashError(msg) {
  const div = el("div", "msg-system", `⚠️ ${escHtml(msg)}`);
  div.style.color = "#ef4444";
  $("msg-list").appendChild(div);
  scrollIfNearBottom();
  setTimeout(() => div.remove(), 4000);
}
