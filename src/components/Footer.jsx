import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '3rem 2rem 2rem',
        textAlign: 'center',
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #7c3aed, #06b6d4, transparent)',
        }}
      />
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 900,
        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1rem',
        letterSpacing: '-0.02em',
      }}>
        Innerflect
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link to="/about" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}>About</Link>
        <Link to="/faq" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}>FAQ</Link>
        <a href="https://github.com/MrNova420/Innerflect" target="_blank" rel="noreferrer" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>GitHub</a>
        <Link to="/privacy" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>Privacy Policy</Link>
      </div>
      <p style={{ color: '#334155', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        AI runs locally on your device. We collect nothing.
      </p>
      <p style={{ color: '#1e293b', fontSize: '0.75rem' }}>
        Built with 💜 by mrnova420 · {new Date().getFullYear()}
      </p>
      <a
        href="https://www.netlify.com"
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', marginTop: '1.25rem', opacity: 0.5, transition: 'opacity 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
      >
        <img src="https://www.netlify.com/v3/img/components/netlify-color-accent.svg" alt="Deploys by Netlify" height="38" />
      </a>
    </motion.footer>
  )
}
