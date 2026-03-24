import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await api.post('/auth/logout', {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
