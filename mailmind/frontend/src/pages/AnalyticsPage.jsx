import { useEffect, useState } from 'react'
import { emailsApi } from '../utils/api'

// Simple bar chart component
function BarChart({ data, color = 'var(--copper)' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '8px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.value || ''}</div>
          <div style={{
            width: '100%', background: color, borderRadius: '4px 4px 0 0',
            height: `${(d.value / max) * 80}px`, minHeight: d.value ? 4 : 0,
            transition: 'height 0.4s ease', opacity: 0.85,
          }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// Donut chart component
function DonutChart({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let cumulative = 0
  const radius = 40
  const cx = 60, cy = 60
  const circumference = 2 * Math.PI * radius

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const offset = circumference * (1 - cumulative)
          const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`
          cumulative += pct
          return (
            <circle key={i} cx={cx} cy={cy} r={radius}
              fill="none" stroke={seg.color} strokeWidth={18}
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={600} fill="var(--text-primary)">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="var(--text-muted)">emails</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {seg.value} ({Math.round((seg.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat card
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--cream-50)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--copper)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// Section card wrapper
function Card({ title, children, style }) {
  return (
    <div style={{ background: 'var(--cream-50)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', ...style }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function buildAnalytics(data) {
  if (!data) return null
  const emails = data.priority_inbox || []
  const tasks = data.tasks || []
  const stats = data.stats || {}

  // Priority breakdown
  const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 }
  emails.forEach(e => { if (priorityCounts[e.priority_label] !== undefined) priorityCounts[e.priority_label]++ })

  // Category breakdown
  const categoryCounts = {}
  emails.forEach(e => {
    const c = e.category || 'other'
    categoryCounts[c] = (categoryCounts[c] || 0) + 1
  })

  // Top senders
  const senderCounts = {}
  emails.forEach(e => {
    const name = (e.sender || '').replace(/<.*>/, '').trim().split(' ').slice(0, 2).join(' ')
    if (name) senderCounts[name] = (senderCounts[name] || 0) + 1
  })
  const topSenders = Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value]) => ({ label: label.length > 14 ? label.slice(0, 13) + '…' : label, value }))

  // Sender importance
  const importanceCounts = {}
  emails.forEach(e => {
    const imp = e.sender_importance || 'unknown'
    importanceCounts[imp] = (importanceCounts[imp] || 0) + 1
  })

  // Emails by day of week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayCounts = Array(7).fill(0)
  emails.forEach(e => {
    try {
      const d = new Date(e.date)
      if (!isNaN(d)) dayCounts[d.getDay()]++
    } catch {}
  })
  const emailsByDay = days.map((label, i) => ({ label, value: dayCounts[i] }))

  // Task stats
  const tasksDone = tasks.filter(t => t.done).length
  const tasksPending = tasks.filter(t => !t.done).length
  const tasksWithDeadline = tasks.filter(t => t.deadline).length

  return {
    priorityCounts,
    categoryCounts,
    topSenders,
    importanceCounts,
    emailsByDay,
    tasksDone,
    tasksPending,
    tasksWithDeadline,
    stats,
    totalEmails: emails.length,
  }
}

export default function AnalyticsPage({ data }) {
  const analytics = buildAnalytics(data)

  if (!analytics) return (
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 60 }}>
      Loading analytics…
    </div>
  )

  if (analytics.totalEmails === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 60 }}>
      No email data yet. Sync your inbox first.
    </div>
  )

  const { priorityCounts, categoryCounts, topSenders, emailsByDay, tasksDone, tasksPending, tasksWithDeadline, stats } = analytics

  const prioritySegments = [
    { label: 'Urgent', value: priorityCounts.urgent, color: 'var(--urgent)' },
    { label: 'High',   value: priorityCounts.high,   color: 'var(--high)' },
    { label: 'Medium', value: priorityCounts.medium, color: 'var(--medium)' },
    { label: 'Low',    value: priorityCounts.low,    color: 'var(--low)' },
  ].filter(s => s.value > 0)

  const categoryColors = {
    action_required: '#185fa5', deadline: '#854f0b', meeting: '#534ab7',
    invoice: '#854f0b', informational: '#3b6d11', other: '#888',
  }
  const categorySegments = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, value]) => ({
      label: key.replace('_', ' '),
      value,
      color: categoryColors[key] || '#aaa',
    }))

  const taskCompletionPct = tasksDone + tasksPending > 0
    ? Math.round((tasksDone / (tasksDone + tasksPending)) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
        Analytics
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          Last 30 days · {stats.total_emails} emails
        </span>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatCard label="Total emails" value={stats.total_emails} sub="Last 30 days" />
        <StatCard label="Urgent emails" value={priorityCounts.urgent} color="var(--urgent)" sub="Need action" />
        <StatCard label="Tasks extracted" value={tasksDone + tasksPending} sub={`${tasksDone} completed`} />
        <StatCard label="Task completion" value={`${taskCompletionPct}%`} color="var(--medium)" sub={`${tasksPending} still pending`} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Priority breakdown">
          {prioritySegments.length > 0
            ? <DonutChart segments={prioritySegments} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</div>
          }
        </Card>
        <Card title="Category breakdown">
          {categorySegments.length > 0
            ? <DonutChart segments={categorySegments} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</div>
          }
        </Card>
      </div>

      {/* Emails by day */}
      <Card title="Emails by day of week">
        <BarChart data={emailsByDay} color="var(--copper)" />
      </Card>

      {/* Top senders */}
      <Card title="Top senders">
        {topSenders.length > 0
          ? <BarChart data={topSenders} color="#534ab7" />
          : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</div>
        }
      </Card>

      {/* Task breakdown */}
      <Card title="Task summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Pending tasks',        value: tasksPending,       color: 'var(--urgent)' },
            { label: 'Completed tasks',       value: tasksDone,          color: 'var(--medium)' },
            { label: 'Tasks with deadlines',  value: tasksWithDeadline,  color: 'var(--high)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--cream-100)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '0.5px solid var(--border-light)' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
