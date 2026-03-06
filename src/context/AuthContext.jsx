import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'Innerflect_auth'
const API = () => window.API_BASE || window.INNERFLECT_API_BASE || ''

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }
    fetch(`${API()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser({ ...u, token }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const r = await fetch(`${API()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Login failed') }
    const { token, user: u } = await r.json()
    localStorage.setItem(TOKEN_KEY, token)
    setUser({ ...u, token })
    return u
  }, [])

  const register = useCallback(async (email, password, name) => {
    const r = await fetch(`${API()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Registration failed') }
    const { token, user: u } = await r.json()
    localStorage.setItem(TOKEN_KEY, token)
    setUser({ ...u, token })
    return u
  }, [])

  const googleLogin = useCallback(async (idToken) => {
    const r = await fetch(`${API()}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken })
    })
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Google login failed') }
    const { token, user: u } = await r.json()
    localStorage.setItem(TOKEN_KEY, token)
    setUser({ ...u, token })
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
