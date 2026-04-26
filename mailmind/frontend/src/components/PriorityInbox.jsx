import { useState } from 'react'

const PRIORITY_COLORS = {
  urgent: 'var(--urgent)',
  high:   'var(--high)',
  medium: 'var(--medium)',
  low:    'var(--low)',
}

const CATEGORY_TAG = {
  action_required: { label: 'Action required', bg: '#e6f1fb', color: '#185fa5' },
  deadline:        { label: 'Deadline',         bg: '#faeeda', color: '#854f0b' },
  meeting:         { label: 'Meeting',           bg: '#eeedfe', color: '#534ab7' },
  invoice:         { label: 'Invoice',           bg: '#faeeda', color: '#854f0b' },
  informational:   { label: 'Informational',     bg: '#eaf3de', color: '#3b6d11' },
  other:           { label: 'Other',             bg: 'var(--cream-200)', color: 'var(--text-muted)' },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = (now - d) / 1000 / 60 / 60
    if (diff < 24) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (diff < 48) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch { return '' }
}

function EmailRow({ email, onClick }) {
  const tag = CATEGORY_TAG[email.category] || CATEGORY_TAG.other
  const dotColor = PRIORITY_COLORS[email.priority_label] || 'var(--low)'

  return (
    <div
      onClick={() => onClick(email)}
      style={{
        background: 'var(--cream-50)', border: '0.5px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', padding: '11px 14px',
        display: 'grid', gridTemplateColumns: '10px 1fr auto',
        gap: 12, alignItems: 'start', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cream-500)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 5, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {email.sender?.replace(/<.*>/, '').trim() || email.sender}
        </div>
        <div className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {email.subject}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {email.priority_reason}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(email.date)}</div>
        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, marginTop: 4, background: tag.bg, color: tag.color, display: 'inline-block' }}>
          {email.deadline_label || tag.label}
        </div>
      </div>
    </div>
  )
}

function EmailModal({ email, onClose }) {
  if (!email) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,29,24,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--cream-50)', borderRadius: 'var(--radius-xl)', padding: 28, maxWidth: 600, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-pop)', border: '0.5px solid var(--border)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{email.subject}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>From: {email.sender}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date: {email.date}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '0 4px' }}>✕</button>
        </div>
        {email.priority_reason && (
          <div style={{ background: 'var(--copper-pale)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: 'var(--copper)', marginBottom: 14 }}>
            AI note: {email.priority_reason}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {email.body || email.snippet}
        </div>
        {email.tasks?.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>Extracted tasks</div>
            {email.tasks.map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 8 }}>
                <span>•</span><span>{t.task}{t.deadline_label ? ` — ${t.deadline_label}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PriorityInbox({ emails = [] }) {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? emails : emails.filter(e => e.priority_label === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Priority inbox</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'urgent', 'high', 'medium'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              border: '0.5px solid var(--border)', cursor: 'pointer',
              background: filter === f ? 'var(--cream-300)' : 'var(--cream-50)',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: filter === f ? 500 : 400,
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>No emails in this category.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(e => <EmailRow key={e.id} email={e} onClick={setSelected} />)}
        </div>
      )}
      <EmailModal email={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
