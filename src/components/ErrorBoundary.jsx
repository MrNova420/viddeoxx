import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Innerflect] Uncaught error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    const isGPU = msg.toLowerCase().includes('webgpu') || msg.toLowerCase().includes('gpu')

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
        <div style={{
          maxWidth: 520,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '3rem 2rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {isGPU ? '🖥️' : '⚠️'}
          </div>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 600 }}>
            {isGPU ? 'WebGPU Not Available' : 'Something went wrong'}
          </h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            {isGPU
              ? 'Your browser or device doesn\'t support WebGPU, which is required to run AI locally. Try Chrome 113+ on a desktop with a dedicated GPU.'
              : 'An unexpected error occurred. Your data is safe — please refresh the page to continue.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
          {!isGPU && (
            <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <summary style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
                Error details
              </summary>
              <pre style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                fontSize: '0.72rem',
                color: '#94a3b8',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {msg}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
