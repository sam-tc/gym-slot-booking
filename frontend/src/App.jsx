import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AdminRoute from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import MyBookingsPage from './pages/MyBookingsPage'
import SessionsPage from './pages/SessionsPage'


function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/sessions"
            replace
          />
        }
      />


      <Route
        path="/auth"
        element={<AuthPage />}
      />


      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SessionsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />


      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyBookingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />


      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AppLayout>
              <AdminPage />
            </AppLayout>
          </AdminRoute>
        }
      />


      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  )
}


export default App