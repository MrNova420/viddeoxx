import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SessionTimer({ getTimeRemaining, isUnlimited, onUpgradeClick }) {
  const [remaining, setRemaining] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isUnlimited) return
    const tick = () => {
      const mins = getTimeRemaining()
      setRemaining(mins)
      setVisible(mins < 10 && mins > 0)
    }
    tick()
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [getTimeRemaining, isUnlimited])

  const formatTime = (mins) => {
    if (!isFinite(mins) || mins < 0) return '0:00'
    const m = Math.floor(mins)
    const s = Math.round((mins - m) * 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={onUpgradeClick}
          style={{
            position: 'fixed', bottom: '80px', right: '16px', zIndex: 300,
            background: remaining < 3 ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
            border: `1px solid ${remaining < 3 ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)'}`,
            borderRadius: '100px',
            padding: '0.5rem 1rem',
            color: remaining < 3 ? '#f87171' : '#a78bfa',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          ⏱ {formatTime(remaining)} remaining
        </motion.button>
      )}
    </AnimatePresence>
  )
}
