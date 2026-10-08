import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { apiRequest } from '../services/api'


const AuthContext = createContext(null)


export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem('token')
  )

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const currentUser = await apiRequest(
          '/auth/me',
          {},
          token,
        )

        setUser(currentUser)
      } catch {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])


    async function login(email, password) {
    const data = await apiRequest(
        '/auth/login',
        {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
        }),
        },
    )

    localStorage.setItem(
        'token',
        data.access_token,
    )

    setToken(data.access_token)

    const currentUser = await apiRequest(
        '/auth/me',
        {},
        data.access_token,
    )

    setUser(currentUser)

    return currentUser
    }


  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }


  const value = {
    token,
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
  }


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}