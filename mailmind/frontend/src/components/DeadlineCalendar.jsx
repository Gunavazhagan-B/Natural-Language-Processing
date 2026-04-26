function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d - now) / 1000 / 60 / 60 / 24)
}

function urgencyStyle(days) {
  if (days === null) return { dot: 'var(--low)', label: '' }
  if (days < 0)  return { dot: 'var(--urgent)', label: 'Overdue' }
  if (days === 0) return { dot: 'var(--urgent)', label: 'Due today' }
  if (days === 1) return { dot: 'var(--high)',   label: 'Due tomorrow' }
  if (days <= 3)  return { dot: 'var(--high)',   label: `${days} days` }
  return { dot: 'var(--medium)', label: `${days} days` }
}

export default function DeadlineCalendar({ deadlines = [] }) {
  if (deadlines.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '48px 0' }}>
        No upcoming deadlines found in your emails.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>
        Upcoming deadlines
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {deadlines.map((email, i) => {
          const days = daysUntil(email.deadline_date)
          const { dot, label } = urgencyStyle(days)
          const d = email.deadline_date ? new Date(email.deadline_date) : null

          return (
            <div key={i} style={{
              background: 'var(--cream-50)', border: '0.5px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              {/* Date block */}
              <div style={{ width: 42, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--copper)', lineHeight: 1 }}>
                  {d ? d.getDate() : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d ? d.toLocaleDateString('en-GB', { month: 'short' }) : ''}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {email.subject}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {email.sender?.replace(/<.*>/, '').trim()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
                <span style={{ fontSize: 11, color: dot, fontWeight: 500 }}>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
