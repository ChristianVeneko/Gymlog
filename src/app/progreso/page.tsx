'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import WorkoutDetailModal from '@/components/WorkoutDetailModal'
import { formatDateString } from '@/lib/utils/dateUtils'

export default function ProgresoPage() {
  const { user } = useAuth()
  useAuthGuard()
  const [stats, setStats] = useState<any>(null)
  const [entrenamientos, setEntrenamientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        // Cargar estadísticas
        const statsRes = await fetch('/api/stats?type=detailed', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const statsData = await statsRes.json()
        if (statsData.success) setStats(statsData.data)

        // Cargar historial de entrenamientos
        const entrenamientosRes = await fetch('/api/entrenamientos?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const entrenamientosData = await entrenamientosRes.json()
        if (entrenamientosData.success) setEntrenamientos(entrenamientosData.data || [])

      } catch (e) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Mi Progreso</h1>
            <p className="text-gray-600">Analiza tu rendimiento y evolución</p>
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

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entrenamientos</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.totalWorkouts || 0}</p>
              </div>
              <div className="text-3xl">💪</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Racha Actual</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.streak || 0} días</p>
              </div>
              <div className="text-3xl">🔥</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sets Completados</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.totalSets || 0}</p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Peso Máximo</p>
                <p className="text-3xl font-bold text-green-600">{stats?.maxWeight || 0} kg</p>
              </div>
              <div className="text-3xl">🏋️</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Historial de entrenamientos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📅 Historial de Entrenamientos</h2>
              {entrenamientos.length > 0 ? (
                <div className="space-y-4">
                  {entrenamientos.map((entrenamiento) => (
                    <button 
                      key={entrenamiento.id} 
                      onClick={() => setSelectedWorkoutId(entrenamiento.id)}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {entrenamiento.workoutTitle || entrenamiento.rutina_name || 'Entrenamiento Libre'}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entrenamiento.completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entrenamiento.completed ? '✅ Completado' : '⏳ En progreso'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📅 {formatDateString(entrenamiento.fecha)}</span>
                          <span>⏱️ {entrenamiento.duration || 0} min</span>
                          <span>🏋️ {entrenamiento.sets_count || 0} sets</span>
                        </div>
                        {entrenamiento.notes && (
                          <p className="text-sm text-gray-600 mt-2">📝 {entrenamiento.notes}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📈</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay entrenamientos registrados</h3>
                  <p className="text-gray-600 mb-6">Comienza a entrenar para ver tu progreso aquí</p>
                  <Link href="/entrenar" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Iniciar Entrenamiento
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Racha de entrenamientos */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔥 Racha Actual</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">{stats?.currentStreak || 0}</div>
                <div className="text-sm text-gray-600">días consecutivos</div>
              </div>
            </div>

            {/* Personal Records */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Records Personales</h3>
              {stats?.personalRecords && stats.personalRecords.length > 0 ? (
                <div className="space-y-3">
                  {stats.personalRecords.slice(0, 5).map((record: any) => (
                    <div key={record.exercise} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{record.exercise}</span>
                      <span className="text-sm font-bold text-blue-600">{record.weight}kg</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-sm text-gray-600">No hay records aún</p>
                </div>
              )}
            </div>

            {/* IA Analysis */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2">🤖 Análisis IA</h3>
              <p className="text-indigo-100 text-sm mb-4">Obtén insights personalizados sobre tu progreso</p>
              <Link href="/ia" className="block w-full text-center bg-white text-indigo-600 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                Ver Análisis
              </Link>
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