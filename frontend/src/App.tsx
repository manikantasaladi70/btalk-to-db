import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import QueryPage from './pages/QueryPage'
import HistoryPage from './pages/HistoryPage'
import Sidebar from './components/Sidebar'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const token = useStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/query" element={<Protected><QueryPage /></Protected>} />
      <Route path="/history" element={<Protected><HistoryPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
