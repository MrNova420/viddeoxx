/* ─── JS: viddeoxx ───────────────────────── */

// Year
document.querySelectorAll('#yr').forEach(el => el.textContent = new Date().getFullYear());

// Anonymous pageview beacon (no PII — just the path)
fetch('/api/analytics/view', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ path: window.location.pathname }),
  keepalive: true
}).catch(() => {});

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links  = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
}

// Status indicator (hits /health)
const dot  = document.getElementById('status-dot');
const text = document.getElementById('status-text');
if (dot && text) {
  fetch('/health', { cache: 'no-store' })
    .then(r => {
      if (r.ok) {
        dot.className  = 'status-dot online';
        text.textContent = 'All systems operational';
      } else throw new Error();
    })
    .catch(() => {
      dot.className  = 'status-dot offline';
      text.textContent = 'Service degraded';
    });
}

// Contact form → POST /api/contact
const form   = document.getElementById('contact-form');
const status = document.getElementById('form-status');
if (form && status) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    status.className = 'form-status';
    status.textContent = '';

    const body = Object.fromEntries(new FormData(form));
    const payload = { name: body.name || 'Anonymous', message: body.message, reply_via: body.reply_via || '' };
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        status.className = 'form-status ok';
        status.textContent = '✓ Message sent! We\'ll be in touch.';
        form.reset();
      } else {
        throw new Error(await r.text());
      }
    } catch (err) {
      status.className = 'form-status err';
      status.textContent = '✗ Something went wrong. Try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send message';
    }
  });
}

// ── Hero live stats (index page only) ────────────────────────────────────────
(function loadHeroStats() {
  const vEl = document.getElementById('stat-views');
  const mEl = document.getElementById('stat-msgs');
  if (!vEl && !mEl) return;

  // Fetch analytics (public, no token needed for aggregated totals)
  fetch('/api/stats')
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d) return;
      if (vEl && d.views != null) vEl.textContent = Number(d.views).toLocaleString();
      if (mEl && d.messages != null) mEl.textContent = Number(d.messages).toLocaleString();
    })
    .catch(() => {});
})();

// Performance tracking (load time, TTFB)
(function() {
  try {
    const perf = performance.getEntriesByType('navigation')[0];
    if (!perf) return;
    
    const loadTime = Math.round(perf.loadEventEnd - perf.fetchStart);
    const ttfb = Math.round(perf.responseStart - perf.fetchStart);
    
    if (loadTime > 0 && loadTime < 60000) {
      fetch('/api/analytics/perf', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ 
          path: window.location.pathname,
          load_time: loadTime,
          ttfb: ttfb
        }),
        keepalive: true
      }).catch(() => {});
    }
  } catch(e) {}
})();
