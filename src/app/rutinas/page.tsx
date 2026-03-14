'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import { PlusIcon, PlayIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Rutina {
  id: string
  name: string
  description: string
  daysOfWeek: string[]  // La API devuelve ya parseado como array
  isActive: boolean
  createdAt: string
  ejercicios_count?: number
  total_sets?: number
}

export default function RutinasPage() {
  const { user } = useAuth()
  useAuthGuard()
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRutinas()
  }, [])

  const fetchRutinas = async () => {
    try {
      const response = await fetch('/api/rutinas', {
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        setRutinas(data.data || [])
      } else {
        setError(data.error || 'Error al cargar rutinas')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const deleteRutina = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta rutina?')) return

    try {
      const response = await fetch(`/api/rutinas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        setRutinas(rutinas.filter(r => r.id !== id))
      } else {
        setError(data.error || 'Error al eliminar rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/rutinas/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      const data = await response.json()
      if (data.success) {
        setRutinas(rutinas.map(r =>
          r.id === id ? { ...r, isActive: !isActive } : r
        ))
      } else {
        setError(data.error || 'Error al actualizar rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 Mis Rutinas</h1>
            <p className="text-gray-600">Gestiona tus rutinas de entrenamiento</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              ← Dashboard
            </Link>
            <Link href="/rutinas/crear" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <PlusIcon className="h-5 w-5 mr-2" />
              Nueva Rutina
            </Link>
          </div>
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
                    <h3 className="text-xl font-bold text-gray-900 truncate">{rutina.name}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rutina.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rutina.isActive ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  
                  {rutina.description && (
                    <p className="text-gray-600 mb-4 text-sm line-clamp-2">{rutina.description}</p>
                  )}
                  
                  {rutina.daysOfWeek && rutina.daysOfWeek.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Días programados:</p>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const days = rutina.daysOfWeek
                          const today = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()]
                          return days.map((day: string) => (
                            <span 
                              key={day} 
                              className={`px-2 py-1 text-xs rounded font-medium ${
                                day === today 
                                  ? 'bg-green-500 text-white ring-2 ring-green-400' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {day === today ? `● ${day}` : day}
                            </span>
                          ))
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 mb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span></span>
                      <span>{rutina.createdAt ? new Date(rutina.createdAt).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Fecha no disponible'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span></span>
                      <span>{rutina.ejercicios_count || 0} ejercicios • {rutina.total_sets || 0} series</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end pt-4 border-t space-x-2">
                    <button
                      onClick={() => toggleActive(rutina.id, rutina.isActive)}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                        rutina.isActive 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {rutina.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    
                    <Link 
                      href={`/rutinas/editar/${rutina.id}`}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    
                    <button
                      onClick={() => deleteRutina(rutina.id)}
                      className="px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
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
              Crea tu primera rutina de entrenamiento y comienza tu viaje fitness
            </p>
            <Link 
              href="/rutinas/crear" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Crear Mi Primera Rutina
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}