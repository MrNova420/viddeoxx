import { motion } from 'framer-motion'
import Aurora from '../components/Aurora'
import GlassSurface from '../components/GlassSurface'

const sections = [
  {
    id: 'collect',
    title: '📋 What We Collect',
    color: '#a78bfa',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          We collect the absolute minimum required to run the service:
        </p>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Page views</strong> — path and count only (e.g. &ldquo;/about viewed 12 times&rdquo;).
            Therapy/conversation pages are excluded from tracking entirely.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Performance metrics</strong> — page load times only (no user-agent, no IP).
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Contact form submissions</strong> — name, email, and message when you reach out.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Account data</strong> (optional) — email, display name, plan type, and daily session usage counts.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Pro chat history</strong> — encrypted, stored only when you explicitly save a session.
          </li>
        </ul>
        <p style={{ color: '#64748b', lineHeight: 1.85, marginTop: '1rem', fontSize: '0.9rem' }}>
          That is the complete list. Nothing else reaches our servers.
        </p>
      </>
    ),
  },
  {
    id: 'no-collect',
    title: "🚫 What We Don't Collect",
    color: '#34d399',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          We are technically incapable of collecting the following because they never leave your device:
        </p>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li>Your <strong style={{ color: '#f1f5f9' }}>conversation content</strong> or AI responses</li>
          <li>Your <strong style={{ color: '#f1f5f9' }}>IP address</strong> — for rate-limiting only, a one-way blake2b hash is computed in memory and never written to disk or logs</li>
          <li>Your <strong style={{ color: '#f1f5f9' }}>user-agent string</strong> or device fingerprint</li>
          <li>Your <strong style={{ color: '#f1f5f9' }}>browsing behaviour</strong> inside therapy/conversation pages</li>
        </ul>
        <p style={{ color: '#64748b', lineHeight: 1.85, marginTop: '1rem', fontSize: '0.9rem' }}>
          Session limits for anonymous users are enforced via a one-way hash of your IP (blake2b, 8-byte digest) that is stored only as a daily counter and cannot be reversed to identify you.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: '🧠 How the AI Works (100% In-Browser)',
    color: '#06b6d4',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          Innerflect uses <strong style={{ color: '#f1f5f9' }}>WebLLM</strong> and <strong style={{ color: '#f1f5f9' }}>WebGPU</strong> to run the AI model entirely inside your browser. Here&rsquo;s what that means in practice:
        </p>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li>The AI model is downloaded to your browser&rsquo;s cache on first use</li>
          <li>All inference happens on your GPU — <strong style={{ color: '#f1f5f9' }}>no message is ever sent to a server</strong></li>
          <li>Conversations exist only in your browser&rsquo;s RAM and are wiped when you close the tab</li>
          <li>There is no backend AI server — we don&rsquo;t have one, and we cannot read your chats</li>
        </ul>
        <p style={{ color: '#64748b', lineHeight: 1.85, marginTop: '1rem', fontSize: '0.9rem' }}>
          This is an architectural guarantee, not just a policy promise. Open your browser&rsquo;s Network tab during a conversation — you will see zero outgoing AI requests.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: '🍪 Cookies & Local Storage',
    color: '#f59e0b',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          We use <strong style={{ color: '#f1f5f9' }}>no tracking cookies</strong>, no analytics cookies, and no advertising cookies.
        </p>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          The only storage we use:
        </p>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li><strong style={{ color: '#f1f5f9' }}>JWT session cookie</strong> (HttpOnly) — issued on login so you stay signed in</li>
          <li><strong style={{ color: '#f1f5f9' }}>localStorage</strong> — model preference and first-visit state (never sent to servers)</li>
        </ul>
        <p style={{ color: '#64748b', lineHeight: 1.85, marginTop: '1rem', fontSize: '0.9rem' }}>
          You can clear all of this at any time via your browser&rsquo;s &ldquo;Clear site data&rdquo; option.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: '🏦 Third Parties & Open Source',
    color: '#8b5cf6',
    content: (
      <>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: '1rem' }}>
          We use <strong style={{ color: '#f1f5f9' }}>no third-party analytics SDKs</strong>, no advertising networks, and no tracking pixels.
        </p>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Netlify</strong> — hosts the static frontend under their{' '}
            <a href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6' }}>privacy policy</a>.
          </li>
        </ul>
        <p style={{ color: '#94a3b8', lineHeight: 1.85, marginTop: '1rem' }}>
          All source code is open and auditable at{' '}
          <a href="https://github.com/MrNova420/innerflect" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6' }}>
            github.com/MrNova420/innerflect
          </a>.
          You can verify every claim in this policy directly in the code.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: '🗑️ Data Retention & Deletion',
    color: '#ec4899',
    content: (
      <>
        <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: '1.5rem' }}>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Accounts:</strong> email, name, and plan stored while your account exists.
            Contact{' '}
            <a href="mailto:hello@innerflect.app" style={{ color: '#ec4899' }}>hello@innerflect.app</a>{' '}
            with &ldquo;Delete my account&rdquo; — actioned within 7 days.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Anonymous users:</strong> nothing stored server-side beyond a daily rate-limit counter (hashed IP, expires at midnight UTC). Nothing to delete.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Conversations:</strong> never stored — they exist only in browser RAM during your session.
          </li>
          <li>
            <strong style={{ color: '#f1f5f9' }}>Page view / perf data:</strong> aggregate only (no PII). Retained indefinitely as anonymous counts.
          </li>
        </ul>
      </>
    ),
  },
]

export default function Privacy() {
  return (
    <div style={{ paddingTop: '64px' }}>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '8rem 2rem 5rem', textAlign: 'center', overflow: 'hidden' }}>
        <Aurora colors={['#1e1b4b', '#4c1d95', '#0c4a6e']} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #f1f5f9, #a78bfa, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.75, marginBottom: '1rem' }}
          >
            Innerflect is built on a simple principle: your private thoughts are yours.
            We designed the app so we <em>cannot</em> read your conversations — not just that we won't.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ color: '#475569', fontSize: '0.85rem' }}
          >
            Last updated: <strong style={{ color: '#64748b' }}>March 2026</strong>
          </motion.p>
        </div>
      </section>

      {/* Policy Sections */}
      <section style={{ padding: '2rem 2rem 6rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {sections.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <GlassSurface style={{
                padding: '2rem 2.25rem',
                borderLeft: `3px solid ${s.color}`,
              }}>
                <h2 style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                  color: s.color,
                  letterSpacing: '-0.01em',
                }}>
                  {s.title}
                </h2>
                {s.content}
              </GlassSurface>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            marginTop: '3rem',
            textAlign: 'center',
            padding: '2.5rem',
            background: 'rgba(124,58,237,0.05)',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: '20px',
          }}
        >
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>
            Questions about your privacy?
          </p>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
            Email us at{' '}
            <a href="mailto:hello@innerflect.app" style={{ color: '#a78bfa', fontWeight: 600 }}>
              hello@innerflect.app
            </a>
            {' '}— we respond within 48 hours.
          </p>
          <p style={{ color: '#334155', fontSize: '0.8rem' }}>
            For account deletion requests, include "Delete my account" in the subject line.
          </p>
        </motion.div>
      </section>
    </div>
  )
}
