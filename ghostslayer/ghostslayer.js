/* ═══════════════════════════════════════════════════════════════════
   ghostslayer.js — Innerflect ad engine v4
   ─────────────────────────────────────────────────────────────────
   Modes:
   • Ghost mode  — all display ads (banner/sidebar/popup/sticky/inline)
     render into the DOM and track impressions but are INVISIBLE.
     Site always looks completely clean to the user.
   • Global smartlink — EVERY click anywhere opens a background tab
     from smartlink_pool[] with rate-limiting.
   • Per-slot smartlinks — stacked trigger modes for extra coverage.
   • Rotation — multiple content items cycle per slot.
   • Monetag — injects Monetag ad scripts (popunder, push, native)
   ─────────────────────────────────────────────────────────────────
   Chat isolation:
   • On /therapy (AI chat) — ALL intrusive operations are disabled:
     no popups, no smartlinks, no turbo mode, no script injection.
     Only passive impression tracking fires (in idle callback).
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // API_BASE: reads from window.VIDDEOXX_API_BASE (set by Caddy inline or update-api-base.sh)
  // Falls back to same-origin (works when frontend + backend on same Tailscale URL)
  const API_BASE = (typeof window !== 'undefined' && window.VIDDEOXX_API_BASE) || '';

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  // ── Chat mode detection ──────────────────────────────────────────
  // On /therapy we disable ALL intrusive ads so the AI chat is never
  // interrupted, lagged, or distracted. Only passive tracking runs.
  const CHAT_PATH = '/therapy';
  const isChat = () => window.location.pathname.startsWith(CHAT_PATH);

  // ── Idle scheduler ───────────────────────────────────────────────
  // Always run non-critical work in requestIdleCallback so ads
  // NEVER block the main thread / AI chat generation.
  const idle = (fn, timeout) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: timeout || 2000 });
    } else {
      setTimeout(fn, 50);
    }
  };

  // ── Load CSS ─────────────────────────────────────────────────────
  idle(() => {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet'; cssLink.href = '/ghostslayer/ghostslayer.css';
    document.head.appendChild(cssLink);
  });

  // ── Session store ────────────────────────────────────────────────
  const session = { _s: {}, get: k => session._s[k], set: (k,v) => { session._s[k]=v; } };

  // ── Tracking (always idle, never blocks) ─────────────────────────
  function track(event, adId) {
    idle(() => {
      try {
        fetch(API_BASE + '/api/ghostslayer/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, ad_id: adId, page: window.location.pathname }),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => {});
      } catch(_) {}
    });
  }

  function trackClicks(el, adId) {
    el.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => track('click', adId), { passive: true })
    );
    if (el.tagName === 'A')
      el.addEventListener('click', () => track('click', adId), { passive: true });
  }

  // ── Ghost mode ────────────────────────────────────────────────────
  // When ad.visible === false the element is pushed off-screen.
  // It still exists in the DOM so impression tracking fires,
  // but the user never sees it — site stays completely clean.
  function ghostify(el) {
    el.style.cssText +=
      ';position:fixed!important;left:-9999px!important;top:-9999px!important' +
      ';width:1px!important;height:1px!important;overflow:hidden!important' +
      ';opacity:0!important;pointer-events:none!important;z-index:-1!important';
  }

  function isGhost(ad) { return ad.visible === false; }

  // ── Helpers ───────────────────────────────────────────────────────
  function currentPage() { return window.location.pathname.replace(/\/$/, '') || '/'; }

  function matchesPage(pages) {
    if (!pages || pages.includes('*')) return true;
    const p = currentPage();
    return pages.some(pg => pg === p || pg === p + '.html' || p.endsWith(pg));
  }

  function makeLabel(text) {
    const el = document.createElement('span');
    el.className = 'slayer-label'; el.textContent = text || 'Ad';
    return el;
  }

  function makeClose(onClose) {
    const btn = document.createElement('button');
    btn.className = 'slayer-close';
    btn.setAttribute('aria-label', 'Close ad');
    btn.textContent = '×';
    btn.addEventListener('click', e => { e.stopPropagation(); onClose(); });
    return btn;
  }

  function animate(el) { el.classList.add('slayer-fadein'); }

  function applyStyle(el, s) {
    if (!s) return;
    if (s.background)    el.style.background  = s.background;
    if (s.border_bottom) el.style.borderBottom = s.border_bottom;
    if (s.border_top)    el.style.borderTop    = s.border_top;
    if (s.padding)       el.style.padding      = s.padding;
    if (s.text_align)    el.style.textAlign    = s.text_align;
    if (s.width)         el.style.width        = s.width;
    if (s.top)           el.style.top          = s.top;
    if (s.max_width)     el.style.maxWidth     = s.max_width;
    if (s.margin)        el.style.margin       = s.margin;
  }

  // ── Content builder ───────────────────────────────────────────────
  function buildContent(c, ad) {
    if (!c) return document.createTextNode('');
    if (c.type === 'card') {
      const card = document.createElement('div');
      card.className = 'slayer-inline-card';
      if (c.image) {
        const img = document.createElement('img');
        img.src = c.image; img.alt = 'Sponsored'; img.loading = 'lazy';
        card.appendChild(img);
      }
      const body = document.createElement('div');
      body.className = 'slayer-inline-card-body';
      if (ad && ad.label) body.appendChild(makeLabel(ad.label));
      if (c.headline) { const h = document.createElement('h4'); h.textContent = c.headline; body.appendChild(h); }
      if (c.body)     { const p = document.createElement('p');  p.textContent = c.body;     body.appendChild(p); }
      if (c.cta_url)  {
        const a = document.createElement('a');
        a.href = c.cta_url; a.className = 'slayer-btn';
        a.textContent = c.cta_text || 'Learn More';
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        body.appendChild(a);
      }
      card.appendChild(body);
      return card;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = c.html || '';
    return wrap;
  }

  // ── Rotation helper ───────────────────────────────────────────────
  function setupRotation(ad, slot, intervalMs) {
    if (!ad.rotate || ad.rotate.length <= 1) return;
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % ad.rotate.length;
      slot.style.transition = 'opacity .3s'; slot.style.opacity = '0';
      setTimeout(() => {
        slot.innerHTML = '';
        slot.appendChild(buildContent(ad.rotate[idx], ad));
        trackClicks(slot, ad.id);
        slot.style.opacity = '1';
      }, 300);
    }, intervalMs || 8000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DISPLAY AD RENDERERS — each ghostifies when ad.visible === false
  // ═══════════════════════════════════════════════════════════════════

  function renderBanner(ad, settings) {
    const wrap = document.createElement('div');
    wrap.className = `slayer-ad slayer-banner${ad.position === 'bottom' ? ' slayer-banner-bottom' : ''}`;
    wrap.dataset.slayerId = ad.id;

    const slot = document.createElement('div');
    slot.className = 'slayer-banner-slot';
    const first = ad.rotate ? ad.rotate[0] : ad.content;
    slot.appendChild(buildContent(first, ad));
    if (!isGhost(ad) && ad.label) wrap.appendChild(makeLabel(ad.label));
    wrap.appendChild(slot);

    if (!isGhost(ad) && ad.closeable) {
      wrap.appendChild(makeClose(() => {
        wrap.style.transition = 'opacity .3s'; wrap.style.opacity = '0';
        setTimeout(() => wrap.remove(), 300);
      }));
    }
    applyStyle(wrap, ad.style);
    if (!isGhost(ad)) animate(wrap);

    if (ad.position === 'bottom') document.body.appendChild(wrap);
    else { const nav = document.querySelector('.nav') || document.body.firstChild; document.body.insertBefore(wrap, nav); }

    if (isGhost(ad)) ghostify(wrap);

    track('impression', ad.id);
    trackClicks(wrap, ad.id);
    setupRotation(ad, slot, settings.refresh_interval_ms);
  }

  function renderInline(ad, settings) {
    const target = ad.inject_after ? document.querySelector(ad.inject_after) : null;
    if (!target) return;

    const wrap = document.createElement('div');
    wrap.className = 'slayer-ad slayer-inline-wrap';
    wrap.dataset.slayerId = ad.id;

    const slot = document.createElement('div');
    const first = ad.rotate ? ad.rotate[0] : ad.content;
    slot.appendChild(buildContent(first, ad));

    if (!isGhost(ad) && ad.closeable) {
      const cb = makeClose(() => {
        wrap.style.transition = 'opacity .3s'; wrap.style.opacity = '0';
        setTimeout(() => wrap.remove(), 300);
      });
      slot.querySelector('.slayer-inline-card')?.appendChild(cb);
    }
    wrap.appendChild(slot);
    applyStyle(wrap, ad.style);
    if (!isGhost(ad)) animate(wrap);
    target.insertAdjacentElement('afterend', wrap);

    if (isGhost(ad)) ghostify(wrap);

    track('impression', ad.id);
    trackClicks(wrap, ad.id);
    setupRotation(ad, slot, settings.refresh_interval_ms);
  }

  function renderSidebar(ad) {
    const wrap = document.createElement('div');
    wrap.className = `slayer-ad slayer-sidebar slayer-sidebar-${ad.position || 'right'}`;
    wrap.dataset.slayerId = ad.id;
    if (!isGhost(ad) && ad.label) wrap.appendChild(makeLabel(ad.label));
    const first = ad.rotate ? ad.rotate[0] : ad.content;
    wrap.appendChild(buildContent(first, ad));
    if (!isGhost(ad) && ad.closeable) wrap.appendChild(makeClose(() => wrap.remove()));
    applyStyle(wrap, ad.style);
    if (!isGhost(ad)) animate(wrap);
    document.body.appendChild(wrap);

    if (isGhost(ad)) ghostify(wrap);

    track('impression', ad.id);
    trackClicks(wrap, ad.id);
  }

  function renderPopup(ad) {
    if (ad.frequency === 'once_per_session' && session.get('popup_' + ad.id)) return;

    const overlay = document.createElement('div');
    overlay.className = 'slayer-popup-overlay';
    overlay.dataset.slayerId = ad.id;

    const box = document.createElement('div');
    box.className = 'slayer-popup-box';
    if (!isGhost(ad) && ad.label) box.appendChild(makeLabel(ad.label));
    const first = ad.rotate ? ad.rotate[0] : ad.content;
    box.appendChild(buildContent(first, ad));

    const closeBtn = makeClose(() => {
      overlay.style.transition = 'opacity .25s'; overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 250);
      session.set('popup_' + ad.id, true);
    });
    if (!isGhost(ad)) box.appendChild(closeBtn);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeBtn.click(); });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    session.set('popup_' + ad.id, true);

    if (isGhost(ad)) ghostify(overlay);

    track('impression', ad.id);
    trackClicks(overlay, ad.id);
  }

  function renderSticky(ad) {
    const wrap = document.createElement('div');
    const posClass = 'slayer-sticky-' + (ad.position || 'bottom-right').replace(/\s/g, '-');
    wrap.className = `slayer-ad slayer-sticky ${posClass}`;
    wrap.dataset.slayerId = ad.id;
    if (!isGhost(ad) && ad.label) wrap.appendChild(makeLabel(ad.label));
    const first = ad.rotate ? ad.rotate[0] : ad.content;
    wrap.appendChild(buildContent(first, ad));
    if (!isGhost(ad) && ad.closeable) {
      wrap.appendChild(makeClose(() => {
        wrap.style.transition = 'opacity .3s'; wrap.style.opacity = '0';
        setTimeout(() => wrap.remove(), 300);
      }));
    }
    if (!isGhost(ad)) animate(wrap);
    document.body.appendChild(wrap);

    if (isGhost(ad)) ghostify(wrap);

    track('impression', ad.id);
    trackClicks(wrap, ad.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INJECTED AD SCRIPTS — Monetag Popunder / Native Banner / Social Bar
  //  / Banner script / any custom embed code
  // ═══════════════════════════════════════════════════════════════════
  // The network's script is injected into <head> so it executes fully.
  // Any rendered DOM is captured in an off-screen ghost div — invisible.
  // Impressions are still tracked by the network and you still get paid.
  // Popunders open their tabs automatically on click (no visibility needed).
  function renderAdScript(ad) {
    if (!ad.script) return;

    // Ghost anchor: catches anything the ad script renders into the page
    const anchor = document.createElement('div');
    anchor.id = 'slayer-' + ad.id;
    anchor.setAttribute('data-slayer', '');
    ghostify(anchor);
    document.body.appendChild(anchor);

    // Re-create <script> tags so they actually execute
    // (innerHTML does NOT execute scripts for security reasons)
    const tmp = document.createElement('div');
    tmp.innerHTML = ad.script;
    tmp.querySelectorAll('script').forEach(orig => {
      const s = document.createElement('script');
      for (const attr of orig.attributes) s.setAttribute(attr.name, attr.value);
      if (orig.src) { s.src = orig.src; s.async = true; }
      else s.textContent = orig.textContent;
      document.head.appendChild(s);
    });

    // Any non-script HTML Monetag needs (e.g. container <div id="...">)
    Array.from(tmp.children).forEach(node => {
      if (node.tagName !== 'SCRIPT') anchor.appendChild(node.cloneNode(true));
    });

    // Hide anything the script renders after load (Social Bar etc.)
    setTimeout(() => {
      // Remove any fixed/absolute positioned elements the script injected
      // that might be visible (e.g. Social Bar floating widget)
      try {
        document.querySelectorAll(
          '[id*="social"],[class*="social"],[id*="popunder"],[id*="monetag"],[id*="mgads"]'
        ).forEach(el => { if (!el.closest('[data-slayer]')) ghostify(el); });
      } catch(_) {}
    }, 500);

    track('impression', ad.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SMARTLINK — per-slot triggers
  // ═══════════════════════════════════════════════════════════════════

  function renderSmartlink(ad) {
    const urls = ad.urls || [];
    if (!urls.length) return;

    const maxPerSession  = ad.max_per_session  ?? 2;
    const delayBetweenMs = ad.delay_between_ms ?? 4000;
    const sessionKey     = 'sl_count_' + ad.id;
    const sessionLast    = 'sl_last_'  + ad.id;

    function getCount() { return parseInt(session.get(sessionKey)  || '0', 10); }
    function getLast()  { return parseInt(session.get(sessionLast) || '0', 10); }

    function openTab() {
      if (getCount() >= maxPerSession) return;
      if (Date.now() - getLast() < delayBetweenMs) return;
      const url = urls[Math.floor(Math.random() * urls.length)];
      try { const w = window.open(url, '_blank', 'noopener'); if (w) w.blur(); window.focus(); } catch(_) {}
      session.set(sessionKey, getCount() + 1);
      session.set(sessionLast, Date.now());
      track('click', ad.id);
    }

    function armClick(repeat) {
      function handler() {
        openTab();
        if (repeat && getCount() < maxPerSession)
          setTimeout(() => document.addEventListener('click', handler, { once: true, capture: true }), delayBetweenMs);
      }
      document.addEventListener('click', handler, { once: !repeat, capture: true });
    }

    const t = ad.trigger || {};
    switch (t.type) {
      case 'click':
        armClick(t.repeat || false); break;
      case 'timer_then_click':
        setTimeout(() => armClick(t.repeat || false), t.delay_ms || 20000); break;
      case 'scroll_then_click': {
        const pct = t.percent || 50; let armed = false;
        const onScroll = () => {
          if (armed) return;
          if ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100 >= pct) {
            armed = true; window.removeEventListener('scroll', onScroll); armClick(t.repeat || false);
          }
        };
        window.addEventListener('scroll', onScroll, { passive: true }); break;
      }
      case 'interval':
        armClick(false);
        setInterval(() => { if (getCount() < maxPerSession) armClick(false); }, t.interval_ms || 30000); break;
      default:
        armClick(false);
    }
    track('impression', ad.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GLOBAL SMARTLINK — fires on EVERY click from the shared URL pool
  // ═══════════════════════════════════════════════════════════════════

  function initGlobalSmartlink(config) {
    const pool = config.smartlink_pool || [];
    const cfg  = config.smartlink_global || {};
    if (!cfg.enabled || !pool.length) return;

    const maxPerSession  = cfg.max_per_session  ?? 10;
    const minGapMs       = cfg.delay_between_ms ?? 2500;
    const startAfterMs   = cfg.start_after_ms   ?? 0;

    let count    = 0;
    let lastFired = 0;

    function tryOpen() {
      if (count >= maxPerSession) return;
      const now = Date.now();
      if (now - lastFired < minGapMs) return;
      const url = pool[Math.floor(Math.random() * pool.length)];
      try { const w = window.open(url, '_blank', 'noopener'); if (w) w.blur(); window.focus(); } catch(_) {}
      count++;
      lastFired = now;
      track('click', 'smartlink-global');
    }

    function arm() {
      // Passive — no preventDefault, so normal link/button clicks still work
      document.addEventListener('click', tryOpen, { passive: true });
    }

    startAfterMs > 0 ? setTimeout(arm, startAfterMs) : arm();
    track('impression', 'smartlink-global');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POPUP TRIGGER LOGIC
  // ═══════════════════════════════════════════════════════════════════

  function scheduleTrigger(ad, showFn) {
    const t = ad.trigger || {};

    if (t.type === 'scroll') {
      const pct = t.percent || 50; let fired = false;
      const onScroll = () => {
        if (fired) return;
        if ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100 >= pct) {
          fired = true; window.removeEventListener('scroll', onScroll); showFn();
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true }); return;
    }
    if (t.type === 'exit') {
      let fired = false;
      const onOut = e => {
        if (fired) return;
        if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
          fired = true; document.removeEventListener('mouseout', onOut); showFn();
        }
      };
      document.addEventListener('mouseout', onOut); return;
    }
    if (t.type === 'manual' && t.event) {
      window.addEventListener(t.event, () => showFn(), { once: true }); return;
    }
    const delay = t.delay_ms ?? ad.delay_ms ?? 0;
    delay > 0 ? setTimeout(showFn, delay) : showFn();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TURBO MODE — every click OR scroll fires ALL smartlinks at once,
  //  ignoring rate limits. Off by default. Toggled from admin.
  // ═══════════════════════════════════════════════════════════════════

  function initTurboMode(config, allSmartlinkFns) {
    const t = config.turbo_mode || {};
    if (!t.enabled) return;

    const pool    = config.smartlink_pool || [];
    const minGap  = t.min_gap_ms ?? 800;  // short gap even in turbo
    let lastFired = 0;

    function blastAll() {
      const now = Date.now();
      if (now - lastFired < minGap) return;
      lastFired = now;
      // Fire global pool URL
      if (pool.length) {
        const url = pool[Math.floor(Math.random() * pool.length)];
        try { const w = window.open(url, '_blank', 'noopener'); if (w) w.blur(); window.focus(); } catch(_) {}
        track('click', 'smartlink-global');
      }
      // Fire every registered per-slot smartlink opener
      allSmartlinkFns.forEach(fn => { try { fn(); } catch(_) {} });
    }

    document.addEventListener('click',  blastAll, { passive: true });
    document.addEventListener('scroll', blastAll, { passive: true });
    track('impression', 'turbo-mode');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MONETAG INTEGRATION
  // ═══════════════════════════════════════════════════════════════════
  function loadMonetag(config) {
    if (isChat()) return; // never on chat page
    const m = config.monetag;
    if (!m || !m.enabled || !m.publisher_id) return;

    idle(() => {
      // Monetag popunder / push / social bar script injection
      if (m.popunder_script) {
        const s = document.createElement('script');
        s.src = m.popunder_script;
        s.async = true;
        s.setAttribute('data-cfasync', 'false');
        document.head.appendChild(s);
      }
      // Native banner injection targets
      if (m.native_zones && Array.isArray(m.native_zones)) {
        m.native_zones.forEach(zone => {
          if (!zone.target_selector || !zone.script_src) return;
          const targets = document.querySelectorAll(zone.target_selector);
          targets.forEach(target => {
            const s = document.createElement('script');
            s.src = zone.script_src;
            s.async = true;
            target.insertAdjacentElement('afterend', s);
          });
        });
      }
      track('impression', 'monetag-init');
    }, 3000);
  }

  // ── Adblock detection ────────────────────────────────────────────
  function detectAdblock(cb) {
    const bait = document.createElement('div');
    bait.className = 'ad banner pub_300x250 pub_300x250m pub_728x90 text-ad textAd';
    bait.style.cssText = 'position:absolute;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(bait);
    requestAnimationFrame(() => {
      const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
      bait.remove();
      cb(blocked);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN LOADER
  // ═══════════════════════════════════════════════════════════════════

  const SCRIPT_TYPES = new Set(['popunder','native_banner','social_bar','banner_script','script']);

  function loadAds(config) {
    if (!config.enabled) return;
    const settings = config.settings || {};
    const chatMode = isChat();

    // Monetag scripts (deferred, not on chat page)
    loadMonetag(config);

    // Adblock detection callback (optional — use for soft gate or fallback)
    if (config.adblock_fallback && !chatMode) {
      detectAdblock(blocked => {
        if (blocked && config.adblock_fallback.fallback_ad_id) {
          const ad = (config.ads || []).find(a => a.id === config.adblock_fallback.fallback_ad_id);
          if (ad) idle(() => { try { renderBanner(ad, settings); } catch(_) {} });
        }
      });
    }

    // Global every-click smartlink pool — DISABLED on chat page
    if (!chatMode && !(config.turbo_mode && config.turbo_mode.enabled)) {
      initGlobalSmartlink(config);
    }

    const ads = (config.ads || [])
      .filter(ad => ad.id && ad.enabled !== false && matchesPage(ad.pages));

    // Collect turbo openers (raw fire functions for per-slot smartlinks)
    const turboOpeners = [];

    ads.forEach(ad => {
      // On chat page: only run passive ghost ads (impression tracking) — skip ALL intrusive types
      if (chatMode && (ad.type === 'popup' || ad.type === 'smartlink' || SCRIPT_TYPES.has(ad.type))) return;

      const run = () => {
        try {
          switch (ad.type) {
            case 'banner':    renderBanner(ad, settings);                  break;
            case 'inline':    renderInline(ad, settings);                  break;
            case 'sidebar':   renderSidebar(ad);                           break;
            case 'sticky':    renderSticky(ad);                            break;
            case 'popup':     scheduleTrigger(ad, () => renderPopup(ad)); return;
            case 'smartlink': {
              const urls = ad.urls || [];
              if (urls.length) {
                turboOpeners.push(() => {
                  const url = urls[Math.floor(Math.random() * urls.length)];
                  try { const w = window.open(url,'_blank','noopener'); if(w) w.blur(); window.focus(); } catch(_) {}
                  track('click', ad.id);
                });
              }
              renderSmartlink(ad);
              break;
            }
            default:
              if (SCRIPT_TYPES.has(ad.type)) renderAdScript(ad);
              break;
          }
        } catch(e) { console.debug('[ghostslayer] error:', ad.id, e); }
      };

      if (ad.type === 'popup' || ad.type === 'smartlink') { run(); }
      else if (SCRIPT_TYPES.has(ad.type)) { run(); }
      else {
        const d = ad.delay_ms || 0;
        // Always use idle+delay for display ads — never block main thread
        idle(() => { d > 0 ? setTimeout(run, d) : run(); }, d + 500);
      }
    });

    // Start turbo mode after all slots registered — NEVER on chat page
    if (!chatMode && config.turbo_mode && config.turbo_mode.enabled) {
      initTurboMode(config, turboOpeners);
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────
  function boot() {
    // Use idle callback so ads never delay initial page render
    idle(() => {
      fetch('/ghostslayer/ads.json', { cache: 'no-store', credentials: 'omit' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(cfg => loadAds(cfg))
        .catch(e => console.debug('[ghostslayer] failed:', e));
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
