'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import WorkoutDetailModal from '@/components/WorkoutDetailModal'
import { formatDateString } from '@/lib/utils/dateUtils'

// Componente del Calendario de Rachas
function CalendarioRachas({ workoutDates, entrenamientos, onDayClick }: { 
  workoutDates: string[], 
  entrenamientos: any[],
  onDayClick: (date: string) => void 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek, year, month }
  }
  
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  
  const isWorkoutDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return workoutDates.includes(dateStr)
  }
  
  const getWorkoutsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return entrenamientos.filter(e => e.fecha.startsWith(dateStr))
  }
  
  const handleDayClick = (day: number) => {
    const workouts = getWorkoutsForDay(day)
    if (workouts.length > 0) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      onDayClick(dateStr)
    }
  }
  
  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year
  }
  
  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  // Calcular racha del mes actual
  const workoutsThisMonth = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter(day => isWorkoutDay(day)).length
  
  // Calcular porcentaje de días entrenados en el mes
  const percentageTrained = Math.round((workoutsThisMonth / daysInMonth) * 100)
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-base md:text-lg font-bold text-gray-900">📅 Calendario de Entrenamientos</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mes anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mes siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Estadísticas del mes */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
        <div className="bg-blue-50 rounded-lg p-2 md:p-3 text-center">
          <div className="text-xl md:text-2xl font-bold text-blue-600">{workoutsThisMonth}</div>
          <div className="text-[10px] md:text-xs text-blue-700">Entrenamientos</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 md:p-3 text-center">
          <div className="text-xl md:text-2xl font-bold text-green-600">{percentageTrained}%</div>
          <div className="text-[10px] md:text-xs text-green-700">Completado</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 md:p-3 text-center">
          <div className="text-xl md:text-2xl font-bold text-purple-600">{daysInMonth - workoutsThisMonth}</div>
          <div className="text-[10px] md:text-xs text-purple-700">Días libres</div>
        </div>
      </div>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-1 md:mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[10px] md:text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-1">
        {/* Espacios vacíos antes del primer día */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Días del mes */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const hasWorkout = isWorkoutDay(day)
          const today = isToday(day)
          
          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-md md:rounded-lg relative
                ${hasWorkout 
                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white font-bold shadow-md hover:shadow-lg cursor-pointer' 
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }
                ${today ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                transition-all ${hasWorkout ? 'hover:scale-110' : ''} ${hasWorkout ? 'active:scale-95' : ''}
              `}
              title={hasWorkout ? `✅ Entrenaste el ${day} de ${monthNames[month]} - Clic para detalles` : `No entrenaste el ${day}`}
            >
              {hasWorkout && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] md:text-[10px]">💪</span>
                </div>
              )}
              <span className={`relative text-[10px] md:text-xs ${hasWorkout ? 'font-extrabold' : ''}`}>{day}</span>
            </div>
          )
        })}
      </div>
      
      {/* Leyenda y mensaje motivacional */}
      <div className="mt-3 md:mt-4 space-y-2 md:space-y-3">
        <div className="flex items-center justify-center space-x-3 md:space-x-4 text-[10px] md:text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-gradient-to-br from-green-400 to-green-600"></div>
            <span className="text-gray-600">Entrenado</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-gray-50 border border-gray-300"></div>
            <span className="text-gray-600">Sin entrenar</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded ring-2 ring-blue-500"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
        </div>
        
        {/* Mensaje motivacional */}
        {percentageTrained >= 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-3 text-center">
            <p className="text-xs md:text-sm font-semibold text-yellow-800">
              🏆 ¡Excelente mes! Has entrenado {percentageTrained}% de los días
            </p>
          </div>
        )}
        {percentageTrained >= 50 && percentageTrained < 80 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3 text-center">
            <p className="text-xs md:text-sm font-semibold text-blue-800">
              💪 ¡Buen trabajo! Llevas {percentageTrained}% del mes entrenado
            </p>
          </div>
        )}
        {percentageTrained > 0 && percentageTrained < 50 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 md:p-3 text-center">
            <p className="text-xs md:text-sm font-semibold text-purple-800">
              🎯 ¡Vamos! Puedes mejorar tu consistencia este mes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProgresoPage() {
  const { user } = useAuth()
  useAuthGuard()
  const [stats, setStats] = useState<any>(null)
  const [entrenamientos, setEntrenamientos] = useState<any[]>([])
  const [workoutDates, setWorkoutDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayWorkouts, setDayWorkouts] = useState<any[]>([])
  const [showDayModal, setShowDayModal] = useState(false)
  
  const handleDayClick = (date: string) => {
    const workouts = entrenamientos.filter(e => e.fecha.startsWith(date))
    setDayWorkouts(workouts)
    setSelectedDate(date)
    setShowDayModal(true)
  }

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
        if (entrenamientosData.success) {
          setEntrenamientos(entrenamientosData.data || [])
        }

        // Cargar todos los días entrenados para el calendario (últimos 6 meses)
        const allEntrenamientosRes = await fetch('/api/entrenamientos?limit=1000&completed=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const allEntrenamientosData = await allEntrenamientosRes.json()
        if (allEntrenamientosData.success) {
          const dates = allEntrenamientosData.data
            .map((e: any) => e.fecha.split('T')[0])
            .filter((date: string, index: number, self: string[]) => self.indexOf(date) === index)
          setWorkoutDates(dates)
        }

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

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Racha Actual</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.streak || 0} días</p>
                <p className="text-xs text-orange-700 mt-1">
                  {stats?.streak > 0 ? '¡Sigue así! 💪' : 'Comienza hoy'}
                </p>
              </div>
              <div className="text-4xl animate-pulse">🔥</div>
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

        {/* Calendario de rachas */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarioRachas 
              workoutDates={workoutDates} 
              entrenamientos={entrenamientos}
              onDayClick={handleDayClick}
            />
          </div>
          
          {/* Mini resumen lateral en desktop */}
          <div className="hidden lg:block space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Resumen Rápido</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total entrenamientos:</span>
                  <span className="font-bold text-blue-600">{stats?.totalWorkouts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Racha actual:</span>
                  <span className="font-bold text-orange-600">{stats?.streak || 0} días</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sets completados:</span>
                  <span className="font-bold text-purple-600">{stats?.totalSets || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">💡 Consejo</h4>
              <p className="text-xs text-gray-700 leading-relaxed">
                Haz clic en cualquier día verde del calendario para ver los detalles de ese entrenamiento
              </p>
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
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-center">
                <span className="text-2xl mr-2 animate-pulse">🔥</span>
                Racha Actual
              </h3>
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-600 mb-2">
                  {stats?.currentStreak || stats?.streak || 0}
                </div>
                <div className="text-sm text-orange-700 font-medium">días consecutivos</div>
                {(stats?.currentStreak || stats?.streak || 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <p className="text-xs text-orange-600 font-semibold">
                      {(stats?.currentStreak || stats?.streak) >= 7 
                        ? '🎉 ¡Increíble semana!' 
                        : (stats?.currentStreak || stats?.streak) >= 3 
                        ? '💪 ¡Buen ritmo!' 
                        : '👍 ¡Sigue así!'}
                    </p>
                  </div>
                )}
                {(stats?.currentStreak || stats?.streak || 0) === 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <p className="text-xs text-gray-600">
                      ¡Comienza tu racha hoy! 💪
                    </p>
                  </div>
                )}
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

      {/* Modal de entrenamientos del día */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {dayWorkouts.length} entrenamiento{dayWorkouts.length !== 1 ? 's' : ''} realizado{dayWorkouts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {dayWorkouts.length > 0 ? (
                <div className="space-y-4">
                  {dayWorkouts.map((entrenamiento) => (
                    <div 
                      key={entrenamiento.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">
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
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">⏱️</span>
                              <span className="text-gray-700">
                                <strong>{entrenamiento.duration || 0}</strong> min
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">🏋️</span>
                              <span className="text-gray-700">
                                <strong>{entrenamiento.sets_count || 0}</strong> sets
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">🕐</span>
                              <span className="text-gray-700">
                                {new Date(entrenamiento.fecha).toLocaleTimeString('es-ES', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                          
                          {entrenamiento.notes && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-blue-700">📝 Notas:</span> {entrenamiento.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-3 border-t">
                        <button
                          onClick={() => {
                            setShowDayModal(false)
                            setSelectedWorkoutId(entrenamiento.id)
                          }}
                          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Ver detalles completos →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">😴</div>
                  <p className="text-gray-600">No hay entrenamientos registrados para este día</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowDayModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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