import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'


function AdminRoute({ children }) {
  const {
    isAuthenticated,
    isAdmin,
    loading,
  } = useAuth()

  if (loading) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/sessions" replace />
  }

  return children
}


export default AdminRoute