'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'

export default function EntrenarPage() {
  const { user } = useAuth()
  useAuthGuard()
  const [rutinas, setRutinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchRutinas = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const res = await fetch('/api/rutinas', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setRutinas(data.data || [])
        } else {
          setError(data.error || 'Error al cargar rutinas')
        }
      } catch (e) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    fetchRutinas()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎯 Entrenar</h1>
            <p className="text-gray-600">Selecciona una rutina para comenzar tu entrenamiento</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            ← Volver al Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {rutinas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutinas.map((rutina) => (
              <div key={rutina.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{rutina.name}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rutina.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rutina.is_active ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  
                  {rutina.description && (
                    <p className="text-gray-600 mb-4">{rutina.description}</p>
                  )}
                  
                  {rutina.days_of_week && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Días:</p>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(rutina.days_of_week).map((day: string) => (
                          <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      {rutina.ejercicios_count || 0} ejercicios
                    </div>
                    <Link 
                      href={`/entrenar/${rutina.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Entrenar 🏋️‍♂️
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📋</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No tienes rutinas creadas</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Para comenzar a entrenar, primero necesitas crear una rutina con ejercicios
            </p>
            <Link 
              href="/rutinas/crear" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Crear Mi Primera Rutina
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}