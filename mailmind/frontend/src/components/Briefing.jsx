import { Sparkles } from 'lucide-react'

export function Briefing({ text }) {
  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })
  return (
    <div style={{ background:'var(--cream-50)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>
          <Sparkles size={14} color="var(--copper)" />
          Today's briefing — {today}
        </div>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>AI generated</span>
      </div>
      <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65 }}>{text}</p>
    </div>
  )
}

export function StatsRow({ stats }) {
  const cards = [
    { label: 'Emails (3d)', value: stats.total_emails, sub: null, color: 'var(--text-primary)' },
    { label: 'Urgent',       value: stats.urgent,        sub: 'Action needed', color: 'var(--urgent)' },
    { label: 'Tasks',        value: stats.tasks_pending, sub: `${stats.tasks_total} total`, color: 'var(--text-primary)' },
    { label: 'Deadlines',    value: stats.deadlines_count, sub: 'Upcoming', color: 'var(--high)' },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
      {cards.map((c,i) => (
        <div key={i} style={{ background:'var(--cream-50)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 14px' }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
          <div style={{ fontSize:24, fontWeight:600, color: c.color, lineHeight:1 }}>{c.value ?? '—'}</div>
          {c.sub && <div style={{ fontSize:11, color:'var(--copper)', marginTop:3 }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function SyncModal({ firstTime }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(30,29,24,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'var(--cream-50)', borderRadius:'var(--radius-xl)', padding:'36px 40px', textAlign:'center', maxWidth:360, border:'0.5px solid var(--border)', boxShadow:'var(--shadow-pop)' }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--copper-pale)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <div style={{ width:20, height:20, border:'2px solid var(--copper)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        </div>
        <h2 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>
          {firstTime ? 'Setting up MailMind' : 'Syncing emails'}
        </h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
          {firstTime
            ? 'Fetching your last 3 days of emails, building the AI index and running priority analysis. This takes 1–3 minutes on first run.'
            : 'Fetching new emails and updating analysis…'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
