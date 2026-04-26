import { useState } from 'react'
import { authApi } from '../utils/api'
import { Mail, Zap, Shield, List } from 'lucide-react'

const s = {
  page: { height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream-100)' },
  card: { background:'var(--cream-50)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'48px 44px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'var(--shadow-pop)' },
  logo: { display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:32 },
  logoDot: { width:12, height:12, borderRadius:'50%', background:'var(--copper)' },
  logoText: { fontSize:22, fontWeight:600, color:'var(--text-primary)' },
  h1: { fontSize:22, fontWeight:600, color:'var(--text-primary)', marginBottom:8 },
  sub: { fontSize:14, color:'var(--text-muted)', lineHeight:1.6, marginBottom:32 },
  features: { display:'flex', flexDirection:'column', gap:12, marginBottom:36, textAlign:'left' },
  feat: { display:'flex', alignItems:'center', gap:12, fontSize:13, color:'var(--text-secondary)' },
  featIcon: { width:32, height:32, borderRadius:'var(--radius-md)', background:'var(--copper-pale)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  btn: { width:'100%', padding:'13px 0', background:'var(--copper)', color:'#fff', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  note: { fontSize:11, color:'var(--text-muted)', marginTop:14, lineHeight:1.5 },
}

export default function ConnectPage() {
  const [loading, setLoading] = useState(false)

  const connect = async () => {
    setLoading(true)
    try {
      const url = await authApi.getLoginUrl()
      window.location.href = url
    } catch (e) {
      alert('Could not reach backend. Is it running on port 8000?')
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoDot} />
          <span style={s.logoText}>MailMind</span>
        </div>
        <h1 style={s.h1}>Your inbox, intelligently organised</h1>
        <p style={s.sub}>Connect your Gmail to get AI-powered priority scoring, task extraction, deadline detection, and a smart chat assistant — all from your emails.</p>

        <div style={s.features}>
          {[
            [Mail, 'Reads your last 30 days of emails securely'],
            [Zap, 'AI scores priority using Groq + LLaMA 3'],
            [List, 'Extracts tasks and deadlines automatically'],
            [Shield, 'All data stays local on your machine'],
          ].map(([Icon, text], i) => (
            <div key={i} style={s.feat}>
              <div style={s.featIcon}><Icon size={16} color="var(--copper)" /></div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button style={s.btn} onClick={connect} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.3 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.6 13.2 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/><path fill="#FBBC05" d="M10.8 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8.2-6.2z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.2 0-11.4-3.7-13.2-9.3l-8.2 6.2C6.7 42.6 14.7 48 24 48z"/></svg>
          {loading ? 'Redirecting…' : 'Connect Gmail'}
        </button>
        <p style={s.note}>Read-only access · No emails are stored on any server · OAuth 2.0 secured</p>
      </div>
    </div>
  )
}
