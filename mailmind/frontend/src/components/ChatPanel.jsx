import { useState, useRef, useEffect } from 'react'
import { chatApi } from '../utils/api'
import { X, Send, Mail } from 'lucide-react'

const SUGGESTIONS = [
  'What are my most urgent tasks today?',
  'Summarise emails from this week',
  'Do I have any unanswered emails?',
  'What deadlines are coming up?',
  'Any emails about invoices or payments?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
      <div style={{
        maxWidth: '86%', padding: '9px 13px', borderRadius: 'var(--radius-lg)',
        borderBottomRightRadius: isUser ? 4 : undefined,
        borderBottomLeftRadius: isUser ? undefined : 4,
        background: isUser ? 'var(--cream-300)' : 'var(--cream-200)',
        fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55,
      }}>
        {msg.content}
      </div>
      {msg.sources?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '86%', paddingLeft: 4 }}>
          {msg.sources.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--copper)' }}>
              <Mail size={10} />
              <span>{s.sender?.replace(/<.*>/, '').trim()} · {s.date?.slice(0, 16)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatPanel({ onClose }) {
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  const send = async (text) => {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')

    const userMsg = { role: 'user', content: q }
    setHistory(h => [...h, userMsg])
    setLoading(true)

    try {
      const res = await chatApi.ask(q, [...history, userMsg])
      setHistory(h => [...h, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: 'Sorry, something went wrong. Please check the backend is running.', sources: [] }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: 320, borderLeft: '0.5px solid var(--border)', background: 'var(--cream-50)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '13px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="var(--copper)" strokeWidth="1.5">
          <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6l-4 3V5z"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>Ask your inbox</span>
        <span style={{ fontSize: 10, padding: '2px 7px', background: '#eeedfe', color: '#534ab7', borderRadius: 10, border: '0.5px solid #afa9ec' }}>Groq · LLaMA 3</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Ask anything about your emails</div>
            <div style={{ fontSize: 11, color: 'var(--cream-500)' }}>Powered by RAG + Groq</div>
          </div>
        )}
        {history.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ padding: '9px 13px', background: 'var(--cream-200)', borderRadius: 'var(--radius-lg)', borderBottomLeftRadius: 4, display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cream-500)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {history.length === 0 && (
        <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Suggested</div>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{
              fontSize: 12, color: 'var(--text-secondary)', padding: '7px 10px',
              background: 'var(--cream-100)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: '0.5px solid var(--border)', textAlign: 'left',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream-500)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask anything about your emails…"
          style={{
            flex: 1, fontSize: 13, padding: '8px 12px',
            borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)',
            background: 'var(--cream-100)', color: 'var(--text-primary)', outline: 'none',
          }}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            background: input.trim() && !loading ? 'var(--copper)' : 'var(--cream-300)',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <Send size={14} color={input.trim() && !loading ? '#fff' : 'var(--text-muted)'} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4 }
          40% { transform: scale(1.2); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
