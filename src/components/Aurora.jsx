// Self-contained Aurora background component
export default function Aurora({ colors = ['#7c3aed', '#06b6d4', '#1e1b4b'] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {colors.map((c, i) => (
        <div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.3,
          background: c,
          width: `${40 + i * 20}%`,
          height: `${40 + i * 20}%`,
          top: `${10 + i * 20}%`,
          left: `${i * 25}%`,
          animation: `aurora-float-${i} ${6 + i * 2}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes aurora-float-0 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-20px) scale(1.1); } }
        @keyframes aurora-float-1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-20px,30px) scale(1.05); } }
        @keyframes aurora-float-2 { from { transform: translate(0,0) scale(1); } to { transform: translate(20px,10px) scale(1.15); } }
      `}</style>
    </div>
  )
}
