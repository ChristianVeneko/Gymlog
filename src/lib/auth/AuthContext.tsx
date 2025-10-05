'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Verificar token al cargar la aplicación y refrescar si es necesario
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        if (!token && !refreshToken) {
          setLoading(false)
          return
        }

        // Intentar con accessToken primero
        if (token) {
          const response = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const result = await response.json()
          if (result.success && result.data?.user) {
            setUser(result.data.user)
            setLoading(false)
            return
          }
        }

        // Si accessToken falló pero hay refreshToken, intentar refrescar
        if (refreshToken) {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })
          const refreshData = await refreshRes.json()
          if (refreshData.success && refreshData.data?.tokens?.accessToken) {
            localStorage.setItem('accessToken', refreshData.data.tokens.accessToken)
            localStorage.setItem('refreshToken', refreshData.data.tokens.refreshToken)
            // Volver a intentar obtener el perfil
            const profileRes = await fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${refreshData.data.tokens.accessToken}`
              }
            })
            const profileData = await profileRes.json()
            if (profileData.success && profileData.data?.user) {
              setUser(profileData.data.user)
              setLoading(false)
              return
            }
          }
        }

        // Si todo falla, limpiar y forzar logout
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()

      if (result.success) {
        // Guardar tokens
        localStorage.setItem('accessToken', result.data.tokens.accessToken)
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        
        setUser(result.data.user)
        return true
      } else {
        console.error('Error en login:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error en login:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Hook para proteger rutas
export function useAuthGuard() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  return { isAuthenticated, loading }
}