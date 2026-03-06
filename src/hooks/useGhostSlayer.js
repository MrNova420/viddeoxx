const API_BASE = (typeof window !== 'undefined' && window.INNERFLECT_API_BASE) || ''

// Run tracking in idle callback so it NEVER affects chat/UI performance
const idleTrack = (payload) => {
  const send = () => {
    fetch(`${API_BASE}/api/ghostslayer/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(send, { timeout: 3000 })
  } else {
    setTimeout(send, 100)
  }
}

export function useGhostSlayer() {
  function trackImpression(adId, page = window.location.pathname) {
    idleTrack({ event: 'impression', ad_id: adId, page })
  }

  function trackClick(adId, page = window.location.pathname) {
    idleTrack({ event: 'click', ad_id: adId, page })
  }

  return { trackImpression, trackClick }
}
