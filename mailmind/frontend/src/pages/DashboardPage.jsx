import { useEffect, useState, useCallback } from 'react'
import { emailsApi, authApi } from '../utils/api'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import ChatPanel from '../components/ChatPanel'
import PriorityInbox from '../components/PriorityInbox'
import TaskList from '../components/TaskList'
import DeadlineCalendar from '../components/DeadlineCalendar'
import AnalyticsPage from './AnalyticsPage'
import { Briefing, StatsRow, SyncModal } from '../components/Briefing'

export default function DashboardPage({ user, onLogout }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('inbox')
  const [syncing, setSyncing] = useState(false)
  const [firstSync, setFirstSync] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)

  const load = useCallback(async () => {
    try {
      const d = await emailsApi.getDashboard()
      setData(d)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [load])

  useEffect(() => {
    if (data && data.stats.total_emails === 0 && !firstSync) {
      setFirstSync(true)
      setSyncing(true)
      emailsApi.syncBlocking().then(() => {
        setSyncing(false)
        load()
      }).catch(() => setSyncing(false))
    }
  }, [data])

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      await emailsApi.syncBlocking()
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = async () => {
    await authApi.logout()
    onLogout()
  }

  const isAnalytics = tab === 'analytics'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar user={user} onSync={handleManualSync} syncing={syncing} onLogout={handleLogout} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar tab={tab} setTab={setTab} data={data} />
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {data ? (
              <>
                {!isAnalytics && <Briefing text={data.briefing} />}
                {!isAnalytics && <StatsRow stats={data.stats} />}
                {tab === 'inbox'     && <PriorityInbox emails={data.priority_inbox} onRefresh={load} />}
                {tab === 'tasks'     && <TaskList tasks={data.tasks} onRefresh={load} />}
                {tab === 'deadlines' && <DeadlineCalendar deadlines={data.deadlines} />}
                {tab === 'analytics' && <AnalyticsPage data={data} />}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
                Loading dashboard…
              </div>
            )}
          </div>
          {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
        </main>
      </div>
      {syncing && <SyncModal firstTime={firstSync} />}
    </div>
  )
}
