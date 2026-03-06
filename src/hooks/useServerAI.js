/**
 * Server-side AI fallback via backend /api/ai/chat
 * Used when WebGPU is unavailable.
 */

const SYSTEM_PROMPT = `You are Innerflect, a warm and empathetic AI companion.
You help people reflect on their thoughts and feelings in a safe, non-judgmental space.
Keep responses concise (2-4 sentences) unless the user wants more detail.
Never diagnose or provide medical advice. Always encourage professional help for serious issues.`

const getApiBase = () =>
  (typeof window !== 'undefined' && (window.API_BASE || window.INNERFLECT_API_BASE)) || ''

export async function checkServerAIAvailable(apiBase) {
  try {
    const base = apiBase ?? getApiBase()
    const res = await fetch(`${base}/api/ai/status`)
    const data = await res.json()
    return data.server_ai_available === true
  } catch {
    return false
  }
}

export async function sendServerMessage(apiBase, messages, onChunk, signal) {
  const base = apiBase ?? getApiBase()
  const payload = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    model: 'meta-llama/llama-3.1-8b-instruct:free',
  }

  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  // Parse SSE stream
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete line
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) onChunk(delta)
      } catch { /* skip malformed chunks */ }
    }
  }
}
