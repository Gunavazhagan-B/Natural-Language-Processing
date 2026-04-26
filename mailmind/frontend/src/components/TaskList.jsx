import { useState } from 'react'
import { tasksApi } from '../utils/api'

function urgencyColor(due) {
  if (!due) return 'var(--text-muted)'
  const d = new Date(due)
  const now = new Date()
  const diffDays = (d - now) / 1000 / 60 / 60 / 24
  if (diffDays < 0) return 'var(--urgent)'
  if (diffDays < 1) return 'var(--urgent)'
  if (diffDays < 3) return 'var(--high)'
  return 'var(--text-muted)'
}

export default function TaskList({ tasks = [], onRefresh }) {
  const [loading, setLoading] = useState(null)
  const [filter, setFilter] = useState('pending')

  const filtered = filter === 'all' ? tasks : filter === 'pending'
    ? tasks.filter(t => !t.done)
    : tasks.filter(t => t.done)

  const toggle = async (task, idx) => {
    const key = `${task.email_id}-${idx}`
    setLoading(key)
    try {
      await tasksApi.toggleDone(task.email_id, idx)
      await onRefresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          Tasks
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
            {tasks.filter(t => !t.done).length} pending
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['pending', 'done', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              border: '0.5px solid var(--border)', cursor: 'pointer',
              background: filter === f ? 'var(--cream-300)' : 'var(--cream-50)',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: filter === f ? 500 : 400,
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
          {filter === 'pending' ? 'All caught up! No pending tasks.' : 'No tasks here.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((task, i) => {
            const key = `${task.email_id}-${i}`
            const isLoading = loading === key
            return (
              <div key={key} style={{
                background: 'var(--cream-50)', border: '0.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)', padding: '11px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isLoading ? 0.6 : 1,
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => !isLoading && toggle(task, i)}
                  style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: task.done ? 'none' : '1.5px solid var(--cream-500)',
                    background: task.done ? 'var(--medium)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {task.done && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
                    {task.task}
                  </div>
                  <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {task.email_subject}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: task.done ? 'var(--text-muted)' : urgencyColor(task.deadline), fontWeight: 500, flexShrink: 0 }}>
                  {task.done ? 'Done' : (task.deadline_label || task.deadline || '')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
