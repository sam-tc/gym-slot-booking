import { Navigate, Route, Routes } from 'react-router-dom'

import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import MyBookingsPage from './pages/MyBookingsPage'
import SessionsPage from './pages/SessionsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />

      <Route path="/auth" element={<AuthPage />} />

      <Route path="/sessions" element={<SessionsPage />} />

      <Route path="/bookings" element={<MyBookingsPage />} />

      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App