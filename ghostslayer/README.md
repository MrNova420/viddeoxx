# slayer/ — Innerflect Ad Layer

Zero-tracking, self-hosted ad system. All config lives in **ads.json** — no code changes ever needed.

---

## Quick Start

### Enable/disable an ad
Open `ads.json` and flip `"enabled": true/false` on any ad entry. Reload the page — done.

### Add a new banner ad
1. Drop your image in `slayer/banners/my-ad.png` (or `.svg`, `.gif`, `.webp`)
2. Add an entry to `ads.json`:
```json
{
  "id": "my-banner",
  "enabled": true,
  "type": "banner",
  "position": "top",
  "pages": ["*"],
  "label": "Sponsored",
  "content": {
    "type": "html",
    "html": "<a href='https://your-link.com' target='_blank' rel='noopener'><img src='/slayer/banners/my-ad.png' alt='Ad' style='max-height:90px'/></a>"
  },
  "closeable": true,
  "delay_ms": 0
}
```

---

## Ad Types

| type | where it appears |
|------|-----------------|
| `banner` | Full-width top or bottom bar |
| `sidebar` | Fixed right sidebar (160px wide) |
| `inline` | Injected after a CSS selector (e.g. `.hero`) |
| `popup` | Modal popup (timer or manual trigger) |
| `sticky` | Fixed corner widget |

## Pages filter
- `"pages": ["*"]` → every page  
- `"pages": ["/", "/about"]` → only those exact URLs  
- Chat-specific: `"pages": ["/chat", "/chat/"]`

## Popup triggers
```json
"trigger": { "type": "timer", "delay_ms": 15000 }   // after 15s
"trigger": { "type": "scroll", "percent": 50 }       // 50% scroll
"trigger": { "type": "exit" }                        // mouse leaves window
"trigger": { "type": "manual", "event": "myevent" } // fire via JS: window.dispatchEvent(new Event('myevent'))
```

## Frequency cap
```json
"frequency": "once_per_session"  // show once per browser tab session
"frequency": "every_time"        // always show
```

## Settings (top of ads.json)
```json
"settings": {
  "frequency_cap": 3,           // max ads shown per page
  "refresh_interval_ms": 8000,  // rotate banner content every 8s (if multiple)
  "animate": true,              // fade in animations
  "respect_do_not_track": true  // skip all ads if DNT header set
}
```

---

## Using Real Ad Networks (Google AdSense, etc.)

Just paste the ad code as the `html` value:
```json
"content": {
  "type": "html",
  "html": "<ins class='adsbygoogle' style='display:block' data-ad-client='ca-pub-XXXX' data-ad-slot='YYYY' data-ad-format='auto'></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});<\/script>"
}
```
Then add AdSense's `<script>` tag to `www/index.html` `<head>`.

---

## File Structure
```
slayer/
├── ads.json        ← THE ONLY FILE YOU EDIT
├── slayer.js       ← engine (reads ads.json, injects into DOM)
├── slayer.css      ← styles for all ad types
├── banners/        ← drop your images here
│   ├── top-banner.svg
│   ├── bottom-banner.svg
│   ├── sidebar-right.svg
│   ├── inline-card.svg
│   ├── sticky.svg
│   └── chat-banner.svg
└── README.md
```
