import { RefreshCw, LogOut } from 'lucide-react'

const s = {
  bar: { height:52, background:'var(--bg-topbar)', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 },
  logo: { display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:600, color:'var(--text-primary)' },
  dot: { width:10, height:10, borderRadius:'50%', background:'var(--copper)' },
  right: { display:'flex', alignItems:'center', gap:10 },
  syncBtn: { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'var(--cream-50)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:12, color:'var(--text-secondary)', cursor:'pointer' },
  avatar: { width:30, height:30, borderRadius:'50%', background:'var(--cream-300)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, color:'var(--text-secondary)', cursor:'pointer', border:'0.5px solid var(--border)' },
  badge: { fontSize:11, padding:'3px 9px', background:'#eef7ee', color:'#3b6d11', borderRadius:20, border:'0.5px solid #c0dd97' },
}

export default function Topbar({ user, onSync, syncing, onLogout }) {
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U'
  return (
    <div style={s.bar}>
      <div style={s.logo}>
        <div style={s.dot} />
        MailMind
      </div>
      <div style={s.right}>
        <div style={s.badge}>
          <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#3b6d11', marginRight:5, verticalAlign:'middle' }} />
          Auto-sync on
        </div>
        <button style={s.syncBtn} onClick={onSync} disabled={syncing}>
          <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <div title={user?.email} style={s.avatar} onClick={onLogout}>
          {initials}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
