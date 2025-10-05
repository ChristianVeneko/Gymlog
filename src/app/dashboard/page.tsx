'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import ActiveWorkout from '@/components/ActiveWorkout'
import WorkoutDetailModal from '@/components/WorkoutDetailModal'
import { formatDateString } from '@/lib/utils/dateUtils'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  useAuthGuard()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        logout()
        return
      }

      // Cargar estadísticas generales
      const statsRes = await fetch('/api/stats?type=overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.data)

      // Cargar entrenamientos recientes
      const workoutsRes = await fetch('/api/entrenamientos?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const workoutsData = await workoutsRes.json()
      if (workoutsData.success) setRecentWorkouts(workoutsData.data || [])

    } catch (e) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Escuchar evento de entrenamiento finalizado
  useEffect(() => {
    const handleWorkoutFinished = () => {
      console.log('✅ Entrenamiento finalizado, refrescando dashboard...')
      fetchDashboardData()
    }

    window.addEventListener('workoutFinished', handleWorkoutFinished)
    return () => window.removeEventListener('workoutFinished', handleWorkoutFinished)
  }, [fetchDashboardData])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  // Obtener el día de hoy en español
  const getDayOfWeek = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[new Date().getDay()]
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Header simplificado */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🏋️‍♂️ GymLog
              </h1>
              <p className="text-gray-600 text-lg">
                Bienvenido, <span className="font-semibold text-gray-800">{user?.name || 'Usuario'}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Indicador de día actual */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{getDayOfWeek()}</div>
                <div className="text-sm text-gray-600">{getCurrentDate()}</div>
              </div>
              <button 
                onClick={logout} 
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-medium"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Acciones rápidas - SIMPLIFICADAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/rutinas/crear" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Crear Rutina</h3>
                <p className="text-blue-100 text-sm">Nueva rutina de ejercicios</p>
              </div>
              <div className="text-4xl">💪</div>
            </div>
          </Link>

          <Link href="/rutinas" className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Mis Rutinas</h3>
                <p className="text-purple-100 text-sm">Ver todas las rutinas</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </Link>

          <Link href="/progreso" className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Progreso</h3>
                <p className="text-orange-100 text-sm">Estadísticas y análisis</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </Link>
        </div>

        {/* Entrenamiento Activo - SECCIÓN PRINCIPAL */}
        <div className="mb-8">
          <ActiveWorkout />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumen General - SIMPLIFICADO */}
          <div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-lg">📈</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Resumen General</h2>
              </div>
              {stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalWorkouts || 0}</div>
                    <div className="text-sm text-gray-700">Entrenamientos</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{stats.streak || 0} 🔥</div>
                    <div className="text-sm text-gray-700">Racha (días)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{stats.totalSets || 0}</div>
                    <div className="text-sm text-gray-700">Sets Totales</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{stats.maxWeight || 0} kg</div>
                    <div className="text-sm text-gray-700">Peso Máximo</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-3">🎯</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">¡Comienza tu viaje!</h3>
                  <p className="text-gray-600 mb-4">Crea tu primera rutina</p>
                  <Link href="/rutinas/crear" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold">
                    Crear Rutina
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Actividad Reciente - SIMPLIFICADA */}
          <div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-lg">🕒</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Actividad Reciente</h2>
              </div>
              {recentWorkouts.length > 0 ? (
                <div className="space-y-3">
                  {recentWorkouts.slice(0, 5).map((workout) => (
                    <button 
                      key={workout.id} 
                      onClick={() => setSelectedWorkoutId(workout.id)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer text-left"
                    >
                      <div>
                        <div className="font-bold text-gray-900">{workout.workoutTitle || workout.rutina_name || 'Entrenamiento'}</div>
                        <div className="text-sm text-gray-600">
                          {formatDateString(workout.fecha)} • {workout.duration || 0} min
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        workout.completed ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        {workout.completed ? '✅' : '⏳'}
                      </div>
                    </button>
                  ))}
                  <Link href="/progreso" className="block text-center text-blue-600 hover:text-blue-800 text-sm font-bold pt-2">
                    Ver historial →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📝</div>
                  <p className="text-gray-600">No hay entrenamientos aún</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      {selectedWorkoutId && (
        <WorkoutDetailModal 
          workoutId={selectedWorkoutId}
          onClose={() => setSelectedWorkoutId(null)}
        />
      )}
    </div>
  )
}
