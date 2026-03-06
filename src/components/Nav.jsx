import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/therapy', label: 'Therapy Space' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
]

export default function Nav({ onSignIn }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(10,10,15,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <motion.div whileHover={{ scale: 1.03 }} style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}>
            Innerflect
          </span>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 500,
            color: '#475569',
            letterSpacing: '0.04em',
            marginTop: '2px',
          }}>
            a safe place to think out loud
          </span>
        </motion.div>
      </Link>

      {/* Desktop links */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="nav-desktop">
        {links.map(({ to, label }) => (
          <motion.div key={to} whileHover={{ y: -1 }}>
            <Link
              to={to}
              style={{
                color: location.pathname === to ? '#f1f5f9' : '#64748b',
                fontWeight: location.pathname === to ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'color 0.2s',
                textDecoration: 'none',
                borderBottom: location.pathname === to ? '2px solid #7c3aed' : '2px solid transparent',
                paddingBottom: '2px',
              }}
            >
              {label}
            </Link>
          </motion.div>
        ))}

        {/* Auth section */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user.plan !== 'pro' && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                onClick={() => window.__openUpgrade?.()}
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.35)',
                  color: '#a78bfa', borderRadius: '8px',
                  padding: '0.4rem 0.85rem', fontSize: '0.78rem',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✨ Upgrade
              </motion.button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(124,58,237,0.4)' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
              )}
              <span style={{ color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 500 }}>{user.name?.split(' ')[0]}</span>
              {user.plan === 'pro' && <span style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '100px' }}>PRO</span>}
            </div>
            <button
              onClick={logout}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              onClick={() => onSignIn?.()}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Sign in
            </motion.button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/therapy"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Start Session
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="nav-hamburger"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: '#f1f5f9',
          cursor: 'pointer',
          fontSize: '1.5rem',
          padding: '0.5rem',
        }}
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: '64px',
              left: 0,
              right: 0,
              background: 'rgba(10,10,15,0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              padding: '1rem 2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                style={{
                  color: location.pathname === to ? '#f1f5f9' : '#94a3b8',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {label}
              </Link>
            ))}

            {/* Mobile auth + Start Session */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link
                to="/therapy"
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  color: '#fff',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Start Session
              </Link>
              {user ? (
                <>
                  {user.plan !== 'pro' && (
                    <button
                      onClick={() => { setOpen(false); window.__openUpgrade?.() }}
                      style={{
                        background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.35)',
                        color: '#a78bfa', borderRadius: '10px',
                        padding: '0.7rem 1rem', fontSize: '0.9rem',
                        fontWeight: 600, cursor: 'pointer', width: '100%',
                      }}
                    >
                      ✨ Upgrade
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); logout() }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', width: '100%' }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setOpen(false); onSignIn?.() }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', width: '100%' }}
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
      `}</style>
    </motion.nav>
  )
}
