export default function GlassSurface({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(18, 18, 26, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        ...style
      }}
    >
      {children}
    </div>
  )
}
