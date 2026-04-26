import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authApi } from './utils/api'
import ConnectPage from './pages/ConnectPage'
import DashboardPage from './pages/DashboardPage'
import './index.css'

export default function App() {
  const [auth, setAuth] = useState(null) // null = loading

  const checkAuth = async () => {
    try {
      const status = await authApi.getStatus()
      setAuth(status)
    } catch {
      setAuth({ connected: false, user: null })
    }
  }

  useEffect(() => { checkAuth() }, [])

  // Handle OAuth redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      window.history.replaceState({}, '', '/')
      checkAuth()
    }
  }, [])

  if (auth === null) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)', fontSize:13 }}>
      Loading…
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          auth.connected
            ? <DashboardPage user={auth.user} onLogout={() => setAuth({ connected: false, user: null })} />
            : <ConnectPage />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
