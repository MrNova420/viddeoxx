import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// Session limits by plan
export const PLAN_LIMITS = {
  anon:  { sessionMins: 30, label: 'Free (30 min/day)', showTimer: false },
  free:  { sessionMins: 60, label: 'Free account (60 min/day)', showTimer: true },
  pro:   { sessionMins: Infinity, label: 'Pro — Unlimited', showTimer: false },
}

const ANON_USAGE_KEY = 'Innerflect_usage'
const API = () => window.API_BASE || window.INNERFLECT_API_BASE || ''

function getFingerprint() {
  let fp = localStorage.getItem('vx_fp')
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('vx_fp', fp)
  }
  return fp
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function useSessionLimit() {
  const { user } = useAuth()
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [minutesUsedToday, setMinutesUsedToday] = useState(0)
  const [isExpired, setIsExpired] = useState(false)   // hard block (free plan at 60min)
  const [showNudge, setShowNudge] = useState(false)   // soft prompt (anon at 30min — stealth)
  const stopSessionRef = useRef(null)

  const plan = user?.plan === 'pro' ? 'pro' : user ? 'free' : 'anon'
  const limitMins = PLAN_LIMITS[plan].sessionMins
  const isUnlimited = limitMins === Infinity
  // Only show visible countdown for free-account users (not anon — stealth)
  const timerVisible = PLAN_LIMITS[plan].showTimer

  // Load today's usage on mount / when user changes
  useEffect(() => {
    async function loadUsage() {
      if (user) {
        try {
          const r = await fetch(`${API()}/api/usage/today`, {
            headers: { Authorization: `Bearer ${user.token}` }
          })
          if (r.ok) {
            const d = await r.json()
            setMinutesUsedToday(d.minutes_used || 0)
          }
        } catch (_) {}
      } else {
        const today = getTodayKey()
        try {
          const stored = JSON.parse(localStorage.getItem(ANON_USAGE_KEY) || '{}')
          setMinutesUsedToday(stored[today] || 0)
        } catch (_) {}
      }
    }
    loadUsage()
  }, [user])

  const stopSession = useCallback(async (startTime) => {
    const t = startTime ?? null
    if (!t || isUnlimited) return
    const mins = Math.ceil((Date.now() - t) / 60000)
    if (mins <= 0) return
    const today = getTodayKey()
    const fp = getFingerprint()
    try {
      if (user) {
        await fetch(`${API()}/api/usage/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ minutes: mins, fingerprint: fp })
        })
      } else {
        const stored = JSON.parse(localStorage.getItem(ANON_USAGE_KEY) || '{}')
        stored[today] = (stored[today] || 0) + mins
        const keys = Object.keys(stored).sort().slice(-7)
        const clean = {}; keys.forEach(k => { clean[k] = stored[k] })
        localStorage.setItem(ANON_USAGE_KEY, JSON.stringify(clean))
      }
    } catch (_) {}
  }, [isUnlimited, user])

  const startSession = useCallback(() => {
    if (isUnlimited) return
    const now = Date.now()
    setSessionStartTime(now)
    setIsExpired(false)
    setShowNudge(false)
    stopSessionRef.current = () => stopSession(now)
  }, [isUnlimited, stopSession])

  const stopSessionPublic = useCallback(async () => {
    if (stopSessionRef.current) {
      await stopSessionRef.current()
      stopSessionRef.current = null
    }
    setSessionStartTime(null)
  }, [])

  const dismissNudge = useCallback(() => setShowNudge(false), [])

  // Check limits every 10 seconds
  useEffect(() => {
    if (!sessionStartTime || isUnlimited) return
    const interval = setInterval(() => {
      const elapsedMins = (Date.now() - sessionStartTime) / 60000
      const totalUsed = minutesUsedToday + elapsedMins

      if (totalUsed >= limitMins) {
        if (plan === 'anon') {
          // Stealth: don't hard-block anon users — show a soft "get more time" nudge
          // They can still see the chat but input is gently blocked with upgrade prompt
          setShowNudge(true)
          stopSession(sessionStartTime)
          setSessionStartTime(null)
        } else {
          // Free account users get a hard gate after 60min
          setIsExpired(true)
          stopSession(sessionStartTime)
          setSessionStartTime(null)
        }
        clearInterval(interval)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [sessionStartTime, minutesUsedToday, limitMins, isUnlimited, plan, stopSession])

  // Time remaining in current session (minutes)
  const getTimeRemaining = useCallback(() => {
    if (isUnlimited) return Infinity
    if (!sessionStartTime) return Math.max(0, limitMins - minutesUsedToday)
    const elapsed = (Date.now() - sessionStartTime) / 60000
    return Math.max(0, limitMins - minutesUsedToday - elapsed)
  }, [sessionStartTime, minutesUsedToday, limitMins, isUnlimited])

  return {
    plan,
    limitMins,
    isUnlimited,
    timerVisible,   // only true for free-account plan
    isExpired,      // hard block — free plan at 60min
    showNudge,      // soft nudge — anon at 30min (stealth)
    dismissNudge,
    minutesUsedToday,
    getTimeRemaining,
    startSession,
    stopSession: stopSessionPublic,
  }
}
