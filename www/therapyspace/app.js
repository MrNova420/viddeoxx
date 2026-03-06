// TherapySpace — main thread UI only
// ALL ML inference runs in worker.js (Web Worker) — main thread NEVER freezes.
// No transformers.js imports here — worker handles everything.

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_NEW = 150;
const CTX     = 4;

const SYS = `You are TherapySpace, a warm and empathetic AI companion built for reflection and emotional support. You listen without judgment, validate feelings, and ask open-ended questions. You are gentle and non-prescriptive. You never tell someone what to feel. Keep responses to 2–4 sentences unless more depth is clearly needed. You are NOT a therapist and never claim to be. If someone mentions self-harm or suicide, respond with deep compassion and gently encourage them to contact a crisis line.`;

const CRISIS_WORDS = ['kill myself','end my life','want to die','suicide','self harm','self-harm','cut myself','hurt myself','not worth living'];

// ── State ─────────────────────────────────────────────────────────────────────
let modelReady = false, history = [], busy = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const badge   = document.getElementById('badge');
const fill    = document.getElementById('prog-fill');
const pctEl   = document.getElementById('prog-pct');
const fileEl  = document.getElementById('prog-file');
const errBox  = document.getElementById('err-box');
const sendBtn = document.getElementById('send');
const inp     = document.getElementById('inp');

// ── Web Worker ────────────────────────────────────────────────────────────────
const worker = new Worker('./worker.js', { type: 'module' });
let activeBubble = null;
let tokenBuffer  = '';
let rafPending   = false;

// Flush buffered tokens to DOM via rAF — batches updates, never forces layout mid-stream
function flushTokens() {
  if (activeBubble && tokenBuffer) {
    activeBubble.textContent += tokenBuffer;
    tokenBuffer = '';
  }
  rafPending = false;
}

worker.addEventListener('message', ({ data }) => {
  switch (data.type) {
    case 'progress': {
      const p = data.payload;
      if (p.status === 'download' || p.status === 'progress') {
        const pct = p.progress != null ? Math.round(p.progress) : 0;
        fill.style.width  = pct + '%';
        pctEl.textContent = pct + '%';
        const fname = (p.file || '').split('/').pop() || 'Downloading…';
        fileEl.textContent = fname.length > 38 ? fname.slice(0, 35) + '…' : fname;
      } else if (p.status === 'initiate') {
        fill.style.width = '2%'; 
        pctEl.textContent = '0%';
        fileEl.textContent = 'Connecting to model server…';
      } else if (p.status === 'done') {
        fill.style.width = '95%';
        pctEl.textContent = '95%';
        fileEl.textContent = 'Loading into memory…';
      } else if (p.status === 'ready') {
        fill.style.width = '100%'; 
        pctEl.textContent = '100%'; 
        fileEl.textContent = 'Starting chat…';
      }
      break;
    }
    case 'ready':
      modelReady = true;
      // Smooth transition out
      setTimeout(() => {
        document.getElementById('loader')?.remove();
        badge.textContent = '● Online';
        badge.className   = 'badge ready';
        sendBtn.disabled  = false;
        inp.focus();
      }, 500);
      break;

    case 'token':
      // Buffer tokens and flush via rAF — prevents layout thrashing on every token
      if (activeBubble) {
        tokenBuffer += data.token;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(flushTokens);
        }
      }
      break;

    case 'done':
      // Flush any remaining buffered tokens
      if (activeBubble && tokenBuffer) { activeBubble.textContent += tokenBuffer; tokenBuffer = ''; }
      if (activeBubble) {
        const finalText = activeBubble.textContent.trim() || '…';
        history.push({ role: 'assistant', content: finalText });
        activeBubble.closest('.msg')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      activeBubble = null;
      sendBtn.disabled = false;
      busy = false;
      break;

    case 'error':
    case 'load_error':
      if (activeBubble) activeBubble.textContent = '⚠️ Something went wrong. Try refreshing.';
      activeBubble = null;
      if (data.type === 'load_error') {
        badge.textContent = '✕ Failed'; badge.className = 'badge err';
        errBox.style.display = 'block';
        errBox.innerHTML = `<strong>⚠️ Model failed to load.</strong><br>${data.message}<br><br><button onclick="location.reload()" style="background:rgba(124,58,237,.8);border:none;color:#fff;padding:.5rem 1rem;border-radius:8px;cursor:pointer;margin-top:.5rem">Retry</button>`;
      }
      sendBtn.disabled = false;
      busy = false;
      break;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function addMsg(role, text) {
  document.getElementById('welcome')?.remove();
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const from = document.createElement('div');
  from.className   = 'msg-from';
  from.textContent = role === 'user' ? 'You' : 'TherapySpace';
  const b = document.createElement('div');
  b.className   = 'bubble';
  b.textContent = text;
  wrap.appendChild(from);
  wrap.appendChild(b);
  document.getElementById('messages').appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return b;
}

function _bindStarters() {
  document.querySelectorAll('.starter').forEach(btn => {
    btn.addEventListener('click', () => { inp.value = btn.textContent; inp.focus(); });
  });
}

// ── Send ──────────────────────────────────────────────────────────────────────
function doSend() {
  if (busy) return;
  if (!modelReady) { addMsg('ai', '⏳ Model still loading — please wait a moment…'); return; }
  const text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = '';
  sendBtn.disabled = true;
  busy = true;

  if (CRISIS_WORDS.some(w => text.toLowerCase().includes(w)))
    document.getElementById('crisis').style.display = 'block';

  addMsg('user', text);
  history.push({ role: 'user', content: text });

  // Create response bubble with thinking animation
  document.getElementById('welcome')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'msg ai';
  wrap.innerHTML = '<div class="msg-from">TherapySpace</div><div class="bubble"><div class="thinking"><span></span><span></span><span></span></div></div>';
  document.getElementById('messages').appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
  activeBubble = wrap.querySelector('.bubble');

  // Post to worker — main thread immediately free
  const ctx = [{ role: 'system', content: SYS }, ...history.slice(-(CTX * 2))];
  worker.postMessage({
    type: 'generate',
    messages: ctx,
    config: { max_new_tokens: MAX_NEW, temperature: 0.7, repetition_penalty: 1.1, do_sample: true },
  });

  // Clear thinking dots on first token (handled in token case above)
  const origBubble = activeBubble;
  const clearThinking = (e) => {
    if (e.data.type === 'token' && origBubble.querySelector('.thinking')) {
      origBubble.innerHTML = '';
    }
    if (e.data.type === 'done' || e.data.type === 'error') worker.removeEventListener('message', clearThinking);
  };
  worker.addEventListener('message', clearThinking);
}

// ── Clear chat ────────────────────────────────────────────────────────────────
function doClear() {
  history = [];
  document.getElementById('crisis').style.display = 'none';
  document.getElementById('messages').innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">💜</div>
      <h2>Hey, I'm TherapySpace</h2>
      <p>A private AI companion. Runs entirely in your browser — nothing leaves your device.</p>
      <div class="starters">
        <button class="starter">I've been feeling anxious</button>
        <button class="starter">I need to vent</button>
        <button class="starter">I'm feeling overwhelmed</button>
        <button class="starter">Help me think through something</button>
        <button class="starter">I just need to talk</button>
      </div>
    </div>`;
  _bindStarters();
}

// ── Wire event listeners ──────────────────────────────────────────────────────
sendBtn.addEventListener('click', doSend);
document.getElementById('clear-btn').addEventListener('click', doClear);
inp.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
});
inp.addEventListener('input', () => {
  inp.style.height = 'auto';
  inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
});
_bindStarters();


// ── Config ────────────────────────────────────────────────────────────────────
const MODEL   = 'HuggingFaceTB/SmolLM2-135M-Instruct';
// All other config constants (MAX_NEW, CTX, SYS, CRISIS_WORDS) declared at top of file

// ── State ─────────────────────────────────────────────────────────────────────
let pipe = null, history = [], busy = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const badge  = document.getElementById('badge');
const fill   = document.getElementById('prog-fill');
const pctEl  = document.getElementById('prog-pct');
const fileEl = document.getElementById('prog-file');
const errBox = document.getElementById('err-box');
const sendBtn = document.getElementById('send');
const inp    = document.getElementById('inp');

// ── transformers.js env ───────────────────────────────────────────────────────
env.allowLocalModels  = false;
env.allowRemoteModels = true;
// proxy: true runs ONNX inference in a dedicated Web Worker — prevents UI freeze during generation
env.backends = { onnx: { wasm: { proxy: true, numThreads: 1 } } };

// ── Helpers ───────────────────────────────────────────────────────────────────
function addMsg(role, text) {
  document.getElementById('welcome')?.remove();
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const from = document.createElement('div');
  from.className   = 'msg-from';
  from.textContent = role === 'user' ? 'You' : 'TherapySpace';
  const b = document.createElement('div');
  b.className  = 'bubble';
  b.textContent = text;
  wrap.appendChild(from);
  wrap.appendChild(b);
  document.getElementById('messages').appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return b;
}

function _bindStarters() {
  document.querySelectorAll('.starter').forEach(btn => {
    btn.addEventListener('click', () => {
      inp.value = btn.textContent;
      inp.focus();
    });
  });
}

// ── Send ──────────────────────────────────────────────────────────────────────
async function doSend() {
  if (busy) return;
  if (!pipe) { addMsg('ai', '⏳ Model still loading — please wait a moment…'); return; }
  const text = inp.value.trim();
  if (!text) return;
  inp.value = ''; inp.style.height = '';
  sendBtn.disabled = true;
  busy = true;

  if (CRISIS_WORDS.some(w => text.toLowerCase().includes(w)))
    document.getElementById('crisis').style.display = 'block';

  addMsg('user', text);
  history.push({ role: 'user', content: text });

  // Add streaming bubble immediately so user sees it right away
  document.getElementById('welcome')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'msg ai';
  wrap.innerHTML = '<div class="msg-from">TherapySpace</div><div class="bubble"><div class="thinking"><span></span><span></span><span></span></div></div>';
  document.getElementById('messages').appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
  const bubble = wrap.querySelector('.bubble');
  let streaming = false;

  try {
    const ctx = [{ role: 'system', content: SYS }, ...history.slice(-(CTX * 2))];

    const streamer = new TextStreamer(pipe.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        if (!streaming) { bubble.innerHTML = ''; streaming = true; }
        bubble.textContent += token;
        wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
      },
    });

    const out = await pipe(ctx, {
      max_new_tokens:     MAX_NEW,
      temperature:        0.7,
      repetition_penalty: 1.1,
      do_sample:          true,
      streamer,
    });

    // Fallback: if streamer didn't fire (e.g. proxy mode), extract from output
    if (!streaming) {
      const result = out[0].generated_text;
      bubble.textContent = Array.isArray(result)
        ? (result.at(-1)?.content?.trim() || '…')
        : String(result).trim();
    }

    const finalText = bubble.textContent.trim() || '…';
    history.push({ role: 'assistant', content: finalText });
  } catch (e) {
    bubble.textContent = '⚠️ Something went wrong. Try refreshing.';
    console.error(e);
  }

  sendBtn.disabled = false;
  busy = false;
}

// ── Clear chat ────────────────────────────────────────────────────────────────
function doClear() {
  history = [];
  document.getElementById('crisis').style.display = 'none';
  document.getElementById('messages').innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">💜</div>
      <h2>Hey, I'm TherapySpace</h2>
      <p>A private AI companion. Runs entirely in your browser — nothing leaves your device.</p>
      <div class="starters">
        <button class="starter">I've been feeling anxious</button>
        <button class="starter">I need to vent</button>
        <button class="starter">I'm feeling overwhelmed</button>
        <button class="starter">Help me think through something</button>
        <button class="starter">I just need to talk</button>
      </div>
    </div>`;
  _bindStarters();
}

// ── Wire ALL event listeners immediately (before model loads) ─────────────────
sendBtn.addEventListener('click', doSend);
document.getElementById('clear-btn').addEventListener('click', doClear);

inp.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
});
inp.addEventListener('input', () => {
  inp.style.height = 'auto';
  inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
});

_bindStarters(); // wire starter buttons rendered in HTML

// ── Model loading progress callback ──────────────────────────────────────────
function onProgress(p) {
  if (p.status === 'download' || p.status === 'progress') {
    const pct = p.progress != null ? Math.round(p.progress) : 0;
    fill.style.width  = pct + '%';
    pctEl.textContent = pct + '%';
    const fname = (p.file || '').split('/').pop() || 'Downloading…';
    fileEl.textContent = fname.length > 38 ? fname.slice(0,35)+'…' : fname;
  } else if (p.status === 'initiate') {
    fill.style.width   = '2%';
    fileEl.textContent = 'Starting download…';
  } else if (p.status === 'done') {
    fileEl.textContent = 'Processing…';
  } else if (p.status === 'ready') {
    fill.style.width  = '100%';
    pctEl.textContent = '100%';
    fileEl.textContent = 'Ready!';
  }
}

// ── Load model in background — does NOT block the UI above ────────────────────
(async () => {
  try {
    pipe = await pipeline('text-generation', MODEL, {
      dtype: 'q4',
      progress_callback: onProgress,
    });
    document.getElementById('loader').remove();
    badge.textContent = '● Online';
    badge.className   = 'badge ready';
    sendBtn.disabled  = false;
  } catch (e) {
    console.error('TherapySpace model load error:', e);
    badge.textContent    = '✕ Failed';
    badge.className      = 'badge err';
    errBox.style.display = 'block';
    errBox.textContent   = '⚠️ Model failed to load. Check your connection and try refreshing.';
  }
})();
