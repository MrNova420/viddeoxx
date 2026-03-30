import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Aurora from '../components/Aurora'
import SpotlightCard from '../components/SpotlightCard'
import GlassSurface from '../components/GlassSurface'

const techStack = [
  { icon: '⚛️', name: 'React 18', desc: 'UI framework' },
  { icon: '⚡', name: 'Vite', desc: 'Build tool' },
  { icon: '🤖', name: 'WebLLM', desc: 'Browser AI runtime' },
  { icon: '🧠', name: 'Phi-3.5-mini', desc: 'Primary AI model' },
  { icon: '🔗', name: 'Tailscale', desc: 'Private networking' },
  { icon: '🐍', name: 'FastAPI', desc: 'Backend API' },
  { icon: '🎬', name: 'Framer Motion', desc: 'Animations' },
  { icon: '🗄️', name: 'PostgreSQL', desc: 'Database' },
]

const modelOptions = [
  { id: 'SmolLM2 135M', size: '270 MB', badge: '⚡', tagline: 'Instant — modern GPUs (shader-f16)', color: '#06b6d4' },
  { id: 'SmolLM2 360M', size: '360 MB', badge: '📱', tagline: 'Fast — works on any WebGPU device', color: '#22d3ee' },
  { id: 'Llama 3.2 1B', size: '700 MB', badge: '🚀', tagline: 'Fast & capable — any device', color: '#8b5cf6' },
  { id: 'Gemma 2 2B', size: '1.3 GB', badge: '💎', tagline: 'Balanced quality — modern GPUs', color: '#10b981' },
  { id: 'Phi-3.5-mini', size: '2.3 GB', badge: '⭐', tagline: 'Best quality — 4GB+ GPU', color: '#f59e0b' },
]

export default function About() {
  useEffect(() => {
    document.title = 'About — Innerflect'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Learn how Innerflect keeps your AI therapy conversations private — all processing happens in your browser using WebGPU. No data ever leaves your device.')
  }, [])

  return (
    <div style={{ paddingTop: '64px' }}>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '8rem 2rem 5rem', textAlign: 'center', overflow: 'hidden' }}>
        <Aurora colors={['#1e1b4b', '#4f46e5', '#0e7490']} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #f1f5f9, #a78bfa, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            About Innerflect
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.75 }}
          >
            Innerflect was built on a single idea: mental wellness tools should be{' '}
            <span style={{ color: '#a78bfa' }}>free</span>,{' '}
            <span style={{ color: '#06b6d4' }}>private</span>, and{' '}
            <span style={{ color: '#34d399' }}>accessible to everyone</span>.
          </motion.p>
        </div>
      </section>

      {/* Mission + Story */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2rem', marginBottom: '5rem' }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <GlassSurface style={{ padding: '2.5rem', height: '100%' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#a78bfa' }}>Our Mission</h2>
              <p style={{ color: '#64748b', lineHeight: 1.85, fontSize: '0.98rem' }}>
                Traditional therapy is expensive. Mental health apps harvest your most vulnerable thoughts.
                We built Innerflect because everyone deserves a safe space to think out loud — without a subscription,
                without surveillance, without judgment.
              </p>
              <p style={{ color: '#64748b', lineHeight: 1.85, fontSize: '0.98rem', marginTop: '1rem' }}>
                By running the AI entirely in your browser, we make it technically impossible to collect your data.
                There's no server-side storage because there's no server involved at all.
              </p>
            </GlassSurface>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <GlassSurface style={{ padding: '2.5rem', height: '100%' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#06b6d4' }}>Privacy by Design</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: '✅', text: 'AI model runs locally via WebGPU' },
                  { icon: '✅', text: 'Zero network requests during chat' },
                  { icon: '✅', text: 'No accounts, no login' },
                  { icon: '✅', text: 'Conversation cleared on tab close' },
                  { icon: '✅', text: 'No analytics on your messages' },
                  { icon: '✅', text: 'Open source — verify it yourself' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#94a3b8', fontSize: '0.93rem' }}>
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </GlassSurface>
          </motion.div>
        </div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Built With
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Open source, cutting-edge, privacy-first</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '5rem' }}>
          {techStack.map((tech, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <SpotlightCard style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tech.icon}</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{tech.name}</div>
                <div style={{ color: '#475569', fontSize: '0.8rem' }}>{tech.desc}</div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        {/* AI Models */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f1f5f9', textAlign: 'center' }}>
            Choose Your AI
          </h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
            All models run 100% in your browser — pick based on your device's capability.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {modelOptions.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${m.color}25`,
                  borderLeft: `3px solid ${m.color}`,
                  borderRadius: '10px',
                }}
              >
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{m.badge}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>{m.id}</span>
                  <span style={{ color: '#475569', fontSize: '0.82rem', marginLeft: '0.75rem' }}>{m.tagline}</span>
                </div>
                <div style={{
                  padding: '0.25rem 0.6rem', borderRadius: '6px',
                  background: `${m.color}15`, color: m.color,
                  fontSize: '0.78rem', fontWeight: 600, flexShrink: 0,
                }}>
                  {m.size}
                </div>
              </motion.div>
            ))}
          </div>
          <p style={{ color: '#334155', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
            Model downloads once — cached permanently in your browser's storage. Switch anytime from the Therapy Space.
          </p>
        </motion.div>

        {/* Credit */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(124,58,237,0.05)',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: '20px',
          }}
        >
          <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9' }}>
            Built with 💜 by{' '}
            <a href="https://github.com/MrNova420" target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>mrnova420</a>
          </p>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.75rem' }}>
            Mental wellness should be a right, not a product.
          </p>
        </motion.div>
      </section>
    </div>
  )
}
