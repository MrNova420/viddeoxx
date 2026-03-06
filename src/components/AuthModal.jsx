import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(mode, email, password, name) {
  if (mode === 'signup' && (!name || name.trim().length < 2))
    return 'Please enter your name (at least 2 characters)'
  if (!email || !EMAIL_RE.test(email.trim()))
    return 'Please enter a valid email address'
  if (!password || password.length < 6)
    return 'Password must be at least 6 characters'
  return null
}

export default function AuthModal({ mode: initialMode = 'login', onClose }) {
  const { login, register, googleLogin } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Initialize Google Sign-In
  // GOOGLE_CLIENT_ID: set via window.GOOGLE_CLIENT_ID (injected at build time or in index.html)
  // Falls back to env var. If placeholder / missing, Google button is hidden.
  const [googleReady, setGoogleReady] = useState(false)

  useEffect(() => {
    const clientId = window.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') return // no real ID — hide Google btn

    function initGoogle() {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          if (!resp.credential) return
          setLoading(true)
          setError('')
          try {
            await googleLogin(resp.credential)
            onClose()
          } catch (e) {
            setError(e.message)
          } finally {
            setLoading(false)
          }
        },
      })
      window.__googleSignIn = () => window.google.accounts.id.prompt()
      setGoogleReady(true)
    }

    if (window.google?.accounts?.id) initGoogle()
    else { const t = setTimeout(initGoogle, 1500); return () => clearTimeout(t) }
  }, [googleLogin, onClose])

  function validateField(field, value) {
    const errs = { ...fieldErrors }
    if (field === 'name') errs.name = value.trim().length < 2 ? 'At least 2 characters' : ''
    if (field === 'email') errs.email = !EMAIL_RE.test(value.trim()) ? 'Enter a valid email' : ''
    if (field === 'password') errs.password = value.length < 6 ? 'Min 6 characters' : ''
    setFieldErrors(errs)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const validationError = validate(mode, email, password, name)
    if (validationError) { setError(validationError); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, name.trim() || 'User')
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) { setMode(m); setError(''); setFieldErrors({}) }

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed',inset:0,zIndex:600,background:'rgba(10,10,15,0.85)',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'rgba(15,15,25,0.98)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'24px',padding:'2rem',maxWidth:'400px',width:'100%',fontFamily:'Inter,sans-serif' }}
      >
        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem' }}>
          <div>
            <h2 style={{ color:'#f1f5f9',fontSize:'1.3rem',fontWeight:700,margin:0 }}>
              {mode === 'login' ? 'Welcome back' : 'Create free account'}
            </h2>
            {mode === 'signup' && (
              <p style={{ color:'#64748b',fontSize:'0.8rem',margin:'0.25rem 0 0' }}>
                Get 60 min/day free — double your session time ✨
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'1rem' }}>×</button>
        </div>

        {/* Google button — only shown when a real client ID is configured */}
        {googleReady && (
          <>
            <button
              onClick={() => window.__googleSignIn?.()}
              disabled={loading}
              style={{ width:'100%',padding:'0.75rem',borderRadius:'12px',marginBottom:'1.25rem',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',color:'#f1f5f9',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.6rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
            <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.25rem' }}>
              <div style={{ flex:1,height:'1px',background:'rgba(255,255,255,0.08)' }} />
              <span style={{ color:'#475569',fontSize:'0.78rem' }}>or</span>
              <div style={{ flex:1,height:'1px',background:'rgba(255,255,255,0.08)' }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:'0.6rem' }}>
          {mode === 'signup' && (
            <div>
              <input type="text" placeholder="Your name" value={name}
                onChange={e => { setName(e.target.value); validateField('name', e.target.value) }}
                style={{ ...inputStyle, borderColor: fieldErrors.name ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }} />
              {fieldErrors.name && <p style={fieldErrStyle}>{fieldErrors.name}</p>}
            </div>
          )}
          <div>
            <input type="email" placeholder="Email address" value={email}
              onChange={e => { setEmail(e.target.value); validateField('email', e.target.value) }}
              style={{ ...inputStyle, borderColor: fieldErrors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }} />
            {fieldErrors.email && <p style={fieldErrStyle}>{fieldErrors.email}</p>}
          </div>
          <div>
            <input type="password" placeholder="Password (min 6 characters)" value={password}
              onChange={e => { setPassword(e.target.value); validateField('password', e.target.value) }}
              style={{ ...inputStyle, borderColor: fieldErrors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }} />
            {fieldErrors.password && <p style={fieldErrStyle}>{fieldErrors.password}</p>}
          </div>

          {error && (
            <p style={{ color:'#f87171',fontSize:'0.82rem',margin:0,padding:'0.5rem 0.75rem',background:'rgba(239,68,68,0.08)',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.2)' }}>
              ⚠ {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            style={{ background:loading?'rgba(124,58,237,0.3)':'linear-gradient(135deg,#7c3aed,#06b6d4)',color:'#fff',border:'none',borderRadius:'12px',padding:'0.875rem',fontSize:'0.95rem',fontWeight:700,cursor:loading?'not-allowed':'pointer',marginTop:'0.25rem' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create free account'}
          </button>
        </form>

        <p style={{ textAlign:'center',color:'#64748b',fontSize:'0.83rem',marginTop:'1.25rem',marginBottom:0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            style={{ background:'none',border:'none',color:'#a78bfa',cursor:'pointer',fontWeight:600,fontSize:'0.83rem',padding:0 }}>
            {mode === 'login' ? 'Sign up free →' : 'Sign in'}
          </button>
        </p>

        <p style={{ textAlign:'center',color:'#334155',fontSize:'0.72rem',marginTop:'0.75rem',marginBottom:0 }}>
          No credit card · AI runs in your browser · private by design
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:'10px', padding:'0.75rem 1rem', color:'#f1f5f9',
  fontSize:'0.9rem', outline:'none', fontFamily:'inherit',
  width:'100%', boxSizing:'border-box',
}
const fieldErrStyle = { color:'#f87171', fontSize:'0.75rem', margin:'0.2rem 0 0 0.25rem' }
