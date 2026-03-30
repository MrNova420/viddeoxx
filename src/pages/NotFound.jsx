import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  useEffect(() => {
    document.title = '404 — Page Not Found | Innerflect'
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg,#0d0d1a 0%,#1a0d2e 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui,sans-serif',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          fontSize: '6rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '1.5rem',
        }}>
          404
        </div>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', fontWeight: 600 }}>
          Page not found
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.65, marginBottom: '2.5rem' }}>
          This page doesn't exist or may have moved. Your private conversations are still safe.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              color: '#fff',
              borderRadius: 10,
              padding: '0.75rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go home
          </Link>
          <Link
            to="/therapy"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '0.75rem 1.75rem',
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Start session →
          </Link>
        </div>
      </div>
    </div>
  )
}
