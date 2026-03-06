import { useRef } from 'react'

export default function SpotlightCard({ children, className = '', style = {} }) {
  const ref = useRef()
  const handleMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.setProperty('--x', `${x}px`)
    ref.current.style.setProperty('--y', `${y}px`)
  }
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={className}
      style={{
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '2rem',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        background: 'radial-gradient(circle at var(--x,50%) var(--y,50%), rgba(124,58,237,0.15) 0%, rgba(18,18,26,0.9) 60%)',
        transition: 'border-color 0.3s',
        cursor: 'default',
        ...style
      }}
      onMouseEnter={e => { if(ref.current) ref.current.style.borderColor = 'rgba(124,58,237,0.4)' }}
      onMouseLeave={e => { if(ref.current) ref.current.style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}
