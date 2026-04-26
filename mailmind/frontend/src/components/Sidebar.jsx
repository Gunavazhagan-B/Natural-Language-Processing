import { Inbox, CheckSquare, Calendar, BarChart2, Settings } from 'lucide-react'

const navItems = [
  { id: 'inbox',     label: 'Priority inbox',  icon: Inbox,       badgeKey: 'urgent' },
  { id: 'tasks',     label: 'Tasks',            icon: CheckSquare, badgeKey: 'tasks_pending' },
  { id: 'deadlines', label: 'Deadlines',        icon: Calendar,    badgeKey: 'deadlines_count' },
]

export default function Sidebar({ tab, setTab, data }) {
  const stats = data?.stats || {}

  const itemStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 12px', margin: '1px 6px',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13,
    background: tab === id ? 'var(--cream-300)' : 'transparent',
    color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: tab === id ? 500 : 400,
  })

  return (
    <aside style={{ width: 210, background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '12px 0', flexShrink: 0 }}>
      <div style={{ padding: '0 10px 8px', fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Overview</div>

      {navItems.map(({ id, label, icon: Icon, badgeKey }) => {
        const badge = stats[badgeKey] > 0 ? stats[badgeKey] : null
        return (
          <div key={id} onClick={() => setTab(id)} style={itemStyle(id)}>
            <Icon size={15} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && (
              <span style={{ fontSize: 10, padding: '2px 6px', background: id === 'inbox' ? 'var(--urgent)' : 'var(--copper)', color: '#fff', borderRadius: 10 }}>
                {badge}
              </span>
            )}
          </div>
        )
      })}

      <div style={{ padding: '12px 10px 6px', marginTop: 8, fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Insights</div>

      <div onClick={() => setTab('analytics')} style={itemStyle('analytics')}>
        <BarChart2 size={15} />
        <span style={{ flex: 1 }}>Analytics</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', margin: '0 6px 6px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
          <Settings size={15} /> Settings
        </div>
      </div>
    </aside>
  )
}
