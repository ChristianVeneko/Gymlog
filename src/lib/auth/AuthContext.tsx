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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; details?: string[] }>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Verificar sesión al cargar — cookies se envían automáticamente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Intentar obtener perfil (cookie se envía automáticamente)
        const response = await fetch('/api/auth/profile', {
          credentials: 'include'
        })
        const result = await response.json()

        if (result.success && result.data?.user) {
          setUser(result.data.user)
          setLoading(false)
          return
        }

        // Si falló, intentar refresh (cookie de refresh se envía automáticamente)
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        })
        const refreshData = await refreshRes.json()

        if (refreshData.success) {
          // Nuevas cookies ya fueron seteadas, intentar obtener perfil de nuevo
          const profileRes = await fetch('/api/auth/profile', {
            credentials: 'include'
          })
          const profileData = await profileRes.json()
          if (profileData.success && profileData.data?.user) {
            setUser(profileData.data.user)
            setLoading(false)
            return
          }
        }

        // Si todo falla, no hay sesión
        setUser(null)
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data.user)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string; details?: string[] }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data.user)
        return { success: true }
      } else {
        return { success: false, error: result.error, details: result.details }
      }
    } catch (error) {
      console.error('Error en registro:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const logout = async () => {
    try {
      // Llamar al endpoint de logout para limpiar cookies HttpOnly
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Error en logout:', error)
    }
    setUser(null)
    router.push('/login')
  }

  const value = {
    user,
    loading,
    login,
    register,
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