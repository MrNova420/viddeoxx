import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    desc: 'No account needed',
    color: '#64748b',
    features: ['30 min/day', '1 session/day', 'All AI models', 'Private & offline'],
    cta: 'Current plan',
    ctaDisabled: true,
    plan: 'anon',
  },
  {
    name: 'Free Account',
    price: '$0',
    desc: 'With a free account',
    color: '#06b6d4',
    features: ['60 min/day', 'All AI models', 'Private & offline', 'Better model saving'],
    cta: 'Sign up free',
    plan: 'free',
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    desc: 'Unlimited everything',
    color: '#7c3aed',
    badge: '⭐ Best',
    features: ['Unlimited sessions', 'Chat history', 'Resume past sessions', 'Priority support', 'All AI models'],
    cta: 'Upgrade to Pro',
    plan: 'pro',
  },
]

export default function UpgradeModal({ onClose, onLogin, onRegister }) {
  const { user } = useAuth()
  const currentPlan = user?.plan === 'pro' ? 'pro' : user ? 'free' : 'anon'

  const handleCta = (tier) => {
    if (tier.ctaDisabled) return
    if (tier.plan === 'free') { onClose(); onRegister?.() }
    else if (tier.plan === 'pro') {
      fetch((window.API_BASE || window.INNERFLECT_API_BASE || '') + '/api/subscription/upgrade', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token || ''}` }
      }).then(r => r.json()).then(d => alert(d.message || 'Coming soon!')).catch(() => alert('Coming soon!'))
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'rgba(15,15,25,0.98)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '28px', padding: '2rem', maxWidth: '760px', width: '100%' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Choose Your Plan</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>All AI runs in your browser — private, offline, yours.</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            {TIERS.map(tier => {
              const isActive = tier.plan === currentPlan
              return (
                <div key={tier.plan} style={{
                  background: isActive ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '20px', padding: '1.5rem', position: 'relative',
                }}>
                  {tier.badge && <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.75rem', borderRadius: '100px' }}>{tier.badge}</span>}
                  <div style={{ color: tier.color, fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tier.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#f1f5f9', fontSize: '1.8rem', fontWeight: 800 }}>{tier.price}</span>
                    {tier.period && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{tier.period}</span>}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '1.25rem' }}>{tier.desc}</p>
                  <ul style={{ listStyle: 'none', margin: '0 0 1.5rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {tier.features.map(f => <li key={f} style={{ color: '#cbd5e1', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ color: tier.color }}>✓</span>{f}</li>)}
                  </ul>
                  <button
                    onClick={() => handleCta(tier)}
                    disabled={tier.ctaDisabled || isActive}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '12px',
                      fontSize: '0.9rem', fontWeight: 600, cursor: tier.ctaDisabled || isActive ? 'default' : 'pointer',
                      background: isActive ? 'rgba(124,58,237,0.1)' : tier.plan === 'pro' ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : `rgba(${tier.color === '#06b6d4' ? '6,182,212' : '100,116,139'},0.15)`,
                      color: isActive ? '#7c3aed' : tier.plan === 'pro' ? 'white' : tier.color,
                      border: `1px solid ${isActive ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
                      opacity: tier.ctaDisabled ? 0.5 : 1,
                    }}
                  >
                    {isActive ? '✓ Current plan' : tier.cta}
                  </button>
                </div>
              )
            })}
          </div>

          <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', marginTop: '1.5rem' }}>
            Your AI always runs in your browser. No data sent to our servers. Cancel anytime.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
