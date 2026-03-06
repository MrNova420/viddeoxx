import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Aurora from '../components/Aurora'
import { Link } from 'react-router-dom'

const faqs = [
  {
    category: 'Privacy & Data',
    icon: '🔒',
    questions: [
      {
        q: 'Can you read my conversations?',
        a: 'No. Your conversations never leave your device. The AI runs entirely inside your browser — there\'s no server receiving your messages. Even we can\'t see what you type.',
      },
      {
        q: 'What gets stored on my device?',
        a: 'Only the AI model file itself (downloaded once, like an app install) and basic settings like which model you chose. Your conversation is held in memory while the tab is open and disappears the moment you close or refresh it. Nothing is written to disk.',
      },
      {
        q: 'Do you use cookies or tracking?',
        a: 'No tracking cookies, no analytics on your messages, no fingerprinting. We don\'t run Google Analytics or any ad trackers. The only thing stored in your browser is your session preference and model choice.',
      },
      {
        q: 'What if I make an account — does that change things?',
        a: 'Creating an account stores your email, name, and plan type on our server — nothing else. Your conversations are still private and never uploaded. Pro accounts get chat history saving, but that\'s opt-in only and stored securely on our servers, not shared with anyone.',
      },
      {
        q: 'Can the government or anyone force you to hand over my chats?',
        a: 'We genuinely can\'t — because we never have them. There\'s nothing to hand over. Your chats exist only in your browser\'s memory.',
      },
    ],
  },
  {
    category: 'How It Works',
    icon: '🤔',
    questions: [
      {
        q: 'What even is this?',
        a: 'Innerflect is an AI companion you can talk to privately — like journaling, but the journal talks back. It\'s a safe space to work through thoughts, feelings, or just think out loud without worrying about being judged or tracked.',
      },
      {
        q: 'How does the AI run in my browser?',
        a: 'Your browser downloads a small AI model (like installing an app — between 270 MB and 2.3 GB depending on what your device can handle). After that, the AI runs locally using your device\'s graphics card. No internet connection needed to chat.',
      },
      {
        q: 'Why does it need to download something?',
        a: 'The "download" is the AI brain itself. Think of it like downloading a game — it happens once, stays cached on your device, and loads instantly next time. You won\'t need to download it again unless you clear your browser storage.',
      },
      {
        q: 'Does it work without internet?',
        a: 'Yes — once the model is downloaded, Innerflect works completely offline. The AI conversation doesn\'t need the internet at all.',
      },
      {
        q: 'Is this like ChatGPT?',
        a: 'Similar idea — you chat with an AI — but very different under the hood. ChatGPT sends your messages to OpenAI\'s servers. Innerflect runs the AI on your own device, so your words never travel anywhere.',
      },
    ],
  },
  {
    category: 'Getting Started',
    icon: '🚀',
    questions: [
      {
        q: 'What browser do I need?',
        a: 'Chrome (version 113 or newer) works best — on Windows, Mac, Linux, or Android. Edge works too. Safari on Mac/iPhone works if you\'re on macOS Sonoma or iOS 18+. Firefox doesn\'t support it by default yet, but you can enable it in settings.',
      },
      {
        q: 'Will it slow down my computer?',
        a: 'While the AI is generating a response, it uses your GPU briefly — similar to running a game or editing a video. Most modern computers handle it fine. If your device gets warm, try switching to a smaller model in the settings.',
      },
      {
        q: 'Do I need to make an account?',
        a: 'No account needed to start. Just open the app and begin. Anonymous users get 30 minutes of chat per day. Create a free account to get 60 minutes. Pro ($4.99/mo) gives you unlimited sessions and the ability to save and resume past conversations.',
      },
      {
        q: 'Why does it say my browser isn\'t supported?',
        a: 'The AI needs a feature called WebGPU — it\'s like a fast lane for AI processing. Older browsers and Firefox don\'t support it yet. The easiest fix is to download Chrome from google.com/chrome — it\'s free and takes 2 minutes.',
      },
      {
        q: 'The loading bar is stuck — what do I do?',
        a: 'Model downloads can pause on slow connections. Try refreshing the page — the download picks up from where it left off thanks to your browser\'s cache. If it keeps failing, tap "Try Smallest Model" which is much faster to load.',
      },
    ],
  },
  {
    category: 'Safety & Wellbeing',
    icon: '💙',
    questions: [
      {
        q: 'Is this a replacement for therapy?',
        a: 'No — and we\'re upfront about that. Innerflect is a tool for reflection and thinking out loud. If you\'re going through something serious, please reach out to a licensed therapist or counsellor. We always encourage professional support for mental health.',
      },
      {
        q: 'What if I\'m in crisis?',
        a: 'Please contact a crisis line immediately. In the US: 988 Suicide & Crisis Lifeline (call or text 988). In the UK: Samaritans (116 123). Internationally: findahelpline.com has resources for every country. Innerflect is not equipped to handle crises.',
      },
      {
        q: 'Is it safe for kids to use?',
        a: 'Innerflect is designed for adults (18+). The AI is trained to be supportive and non-harmful, but we recommend parental guidance for younger users.',
      },
    ],
  },
  {
    category: 'Plans & Pricing',
    icon: '💳',
    questions: [
      {
        q: 'What\'s free vs paid?',
        a: 'Anonymous (no account): 30 min/day. Free account: 60 min/day. Pro ($4.99/mo): unlimited sessions, chat history, save & resume conversations, access to larger AI models.',
      },
      {
        q: 'What happens when my daily limit runs out?',
        a: 'The chat input locks and you\'ll see an option to sign in or upgrade. Your conversation stays visible — nothing disappears. You can come back tomorrow for another free session, or upgrade for unlimited access.',
      },
      {
        q: 'Can I cancel my subscription anytime?',
        a: 'Yes — cancel anytime with no fees. Your Pro access continues until the end of your billing period.',
      },
      {
        q: 'Is my payment info stored?',
        a: 'Payment is handled entirely by Stripe — we never see or store your card details. Stripe is used by millions of businesses and is fully PCI-DSS compliant.',
      },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      layout
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 0',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#e2e8f0', fontSize: '0.97rem', fontWeight: 500, lineHeight: 1.5 }}>{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: '#7c3aed', fontSize: '1.4rem', flexShrink: 0, lineHeight: 1 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p style={{
              color: '#94a3b8',
              fontSize: '0.92rem',
              lineHeight: 1.8,
              paddingBottom: '1.1rem',
              paddingRight: '2rem',
              margin: 0,
            }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState(null)

  const displayed = activeCategory
    ? faqs.filter(f => f.category === activeCategory)
    : faqs

  return (
    <div style={{ paddingTop: '64px' }}>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '6rem 2rem 4rem', textAlign: 'center', overflow: 'hidden' }}>
        <Aurora colors={['#1e1b4b', '#4f46e5', '#0c4a6e']} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #f1f5f9, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Questions & Answers
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Plain answers to everything you might be wondering — no jargon, no runaround.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category filter */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0 1.5rem 2.5rem' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            background: !activeCategory ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${!activeCategory ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
            color: !activeCategory ? '#a78bfa' : '#64748b',
            borderRadius: '100px',
            padding: '0.4rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {faqs.map(f => (
          <button
            key={f.category}
            onClick={() => setActiveCategory(f.category === activeCategory ? null : f.category)}
            style={{
              background: activeCategory === f.category ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeCategory === f.category ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: activeCategory === f.category ? '#a78bfa' : '#64748b',
              borderRadius: '100px',
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {f.icon} {f.category}
          </button>
        ))}
      </div>

      {/* FAQ sections */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>
        {displayed.map((section, si) => (
          <motion.div
            key={section.category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.07 }}
            style={{ marginBottom: '3rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{section.icon}</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                {section.category}
              </h2>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '0 1.5rem',
            }}>
              {section.questions.map((item, qi) => (
                <FAQItem key={qi} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Still have questions CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            padding: '2.5rem',
            background: 'rgba(124,58,237,0.05)',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: '20px',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤝</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
            Still have questions?
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            We're happy to help — reach out anytime.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/therapy"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                color: '#fff',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Try It Free →
            </Link>
            <a
              href="mailto:hello@innerflect.app"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Contact Us
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
