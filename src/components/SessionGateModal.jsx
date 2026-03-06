import { motion } from 'framer-motion'

// isNudge = true  → anon user hit 30min — soft prompt, NOT a hard block ("get more time")
// isNudge = false → free account hit 60min — hard gate ("time's up, upgrade")
export default function SessionGateModal({ onLogin, onUpgrade, onDismiss, plan, isNudge = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: isNudge ? 'rgba(10,10,15,0.75)' : 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: isNudge ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isNudge ? '0 1rem 2rem' : '2rem',
      }}
    >
      <motion.div
        initial={{ scale: isNudge ? 1 : 0.9, y: isNudge ? 60 : 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: 'rgba(20,20,35,0.97)',
          border: `1px solid ${isNudge ? 'rgba(6,182,212,0.35)' : 'rgba(124,58,237,0.3)'}`,
          borderRadius: isNudge ? '20px' : '24px',
          padding: isNudge ? '1.75rem' : '2.5rem',
          maxWidth: isNudge ? '480px' : '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: isNudge ? '2rem' : '3rem', marginBottom: '0.75rem' }}>
          {isNudge ? '🌟' : '⏰'}
        </div>

        <h2 style={{ color: '#f1f5f9', fontSize: isNudge ? '1.15rem' : '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {isNudge ? 'Keep the conversation going' : "Session Time's Up"}
        </h2>

        <p style={{ color: '#94a3b8', marginBottom: '1.75rem', lineHeight: 1.6, fontSize: isNudge ? '0.9rem' : '1rem' }}>
          {isNudge
            ? "You're on a roll! Create a free account to unlock more chat time — it only takes seconds."
            : plan === 'free'
              ? "You've used your free 60 minutes for today. Come back tomorrow, or upgrade to Pro for unlimited access anytime."
              : "You've used your free 30 minutes for today. Sign up free for more daily chat time."}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Primary CTA: sign up free (for anon) or upgrade to Pro */}
          {plan === 'anon' && (
            <button
              onClick={onLogin}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                color: 'white', border: 'none', borderRadius: '12px',
                padding: '0.875rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              ✨ Create free account — get more time
            </button>
          )}

          <button
            onClick={onUpgrade}
            style={{
              background: plan === 'anon' ? 'rgba(124,58,237,0.12)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              color: plan === 'anon' ? '#a78bfa' : 'white',
              border: plan === 'anon' ? '1px solid rgba(124,58,237,0.35)' : 'none',
              borderRadius: '12px',
              padding: '0.875rem', fontSize: plan === 'anon' ? '0.9rem' : '1rem',
              fontWeight: plan === 'anon' ? 600 : 700, cursor: 'pointer',
            }}
          >
            {plan === 'anon' ? '⭐ Go Pro — unlimited sessions' : '✨ Upgrade to Pro — $4.99/month'}
          </button>

          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', color: '#64748b',
              border: '1px solid rgba(100,116,139,0.15)',
              borderRadius: '12px', padding: '0.65rem',
              fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            {isNudge ? 'Maybe later' : 'Come back tomorrow'}
          </button>
        </div>

        {isNudge && (
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '1rem' }}>
            Free account · no credit card · all AI runs in your browser
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
