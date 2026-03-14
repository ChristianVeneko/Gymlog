'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, XMarkIcon, LightBulbIcon } from '@heroicons/react/24/outline'
import Icon from '@/components/Icon'
import ExerciseImage from '@/components/ExerciseImage'

interface Ejercicio {
  id: string
  name: string
  bodyPart: string
  equipment: string
  target: string
  gifUrl: string
  instructions: string[]
}

interface RutinaEjercicio {
  ejercicioId: string
  ejercicioName: string
  bodyPart: string
  equipment: string
  target: string
  gifUrl: string
  dayOfWeek: string
  order: number
  sets: number
}

interface RutinaForm {
  name: string
  description: string
  daysOfWeek: string[]
  ejerciciosPorDia: Record<string, RutinaEjercicio[]>
  isActive: boolean
}

const DAYS_OF_WEEK = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
]

const BODY_PART_LABELS: Record<string, string> = {
  'back': 'Back',
  'cardio': 'Cardio',
  'chest': 'Chest',
  'lower arms': 'Lower Arms',
  'lower legs': 'Lower Legs',
  'neck': 'Neck',
  'shoulders': 'Shoulders',
  'upper arms': 'Upper Arms',
  'upper legs': 'Upper Legs',
  'waist': 'Waist / Core'
}

// Genera título de día basado en músculos trabajados
const generateDayTitle = (day: string, ejercicios: RutinaEjercicio[]): string => {
  if (!ejercicios || ejercicios.length === 0) return day

  const bodyPartCounts: Record<string, number> = {}
  ejercicios.forEach(ej => {
    const bp = ej.bodyPart || 'unknown'
    bodyPartCounts[bp] = (bodyPartCounts[bp] || 0) + 1
  })

  const top = Object.entries(bodyPartCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([part]) => part.charAt(0).toUpperCase() + part.slice(1))
    .slice(0, 3)

  return top.length > 0 ? `${day} (${top.join(', ')})` : day
}

export default function CrearRutinaPage() {
  const { user } = useAuth()
  useAuthGuard()
  const router = useRouter()

  const [rutina, setRutina] = useState<RutinaForm>({
    name: '',
    description: '',
    daysOfWeek: [],
    ejerciciosPorDia: {},
    isActive: true
  })

  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement | null>(null)
  const [showEjercicioSelector, setShowEjercicioSelector] = useState(false)
  const [showEjercicioConfig, setShowEjercicioConfig] = useState(false)
  const [selectedEjercicio, setSelectedEjercicio] = useState<Ejercicio | null>(null)
  const [ejercicioConfig, setEjercicioConfig] = useState({ sets: 3 })
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset cuando cambia filtro o se abre el modal
  useEffect(() => {
    if (!showEjercicioSelector) return
    setOffset(0)
    setHasMore(true)
    setEjercicios([])
  }, [showEjercicioSelector, searchTerm, selectedBodyPart])

  // Fetch con debounce
  useEffect(() => {
    if (!showEjercicioSelector) return
    const timer = setTimeout(() => {
      fetchEjercicios(0, true)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line
  }, [showEjercicioSelector, searchTerm, selectedBodyPart])

  // Infinite scroll observer
  useEffect(() => {
    if (!showEjercicioSelector || !hasMore || loading || isFetchingMore) return
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore && !loading) {
        fetchEjercicios(offset, false)
      }
    }, { threshold: 0.1, rootMargin: '50px' })

    observer.observe(el)
    return () => {
      observer.unobserve(el)
      observer.disconnect()
    }
    // eslint-disable-next-line
  }, [hasMore, offset, showEjercicioSelector, loading, isFetchingMore])

  const fetchEjercicios = useCallback(async (customOffset = 0, reset = false) => {
    try {
      if (reset) setLoading(true)
      setIsFetchingMore(!reset)

      const params = new URLSearchParams({
        limit: '30',
        offset: customOffset.toString()
      })
      if (searchTerm && searchTerm.length >= 2) {
        params.append('search', searchTerm)
      }
      if (selectedBodyPart) {
        params.append('bodyPart', selectedBodyPart)
      }

      // Si no hay ni search (con >=2 chars) ni bodyPart, no cargar
      if (!selectedBodyPart && (!searchTerm || searchTerm.length < 2)) {
        setEjercicios([])
        setLoading(false)
        setIsFetchingMore(false)
        setHasMore(false)
        return
      }

      const response = await fetch(`/api/ejercicios?${params.toString()}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        if (reset) {
          setEjercicios(data.data || [])
        } else {
          setEjercicios(prev => [...prev, ...(data.data || [])])
        }
        const newOffset = customOffset + (data.data?.length || 0)
        setOffset(newOffset)
        setHasMore(data.pagination?.hasMore ?? false)
      } else {
        setError('Error al cargar ejercicios')
        setHasMore(false)
      }
    } catch (err) {
      setError('Error de conexión')
      setHasMore(false)
    } finally {
      setLoading(false)
      setIsFetchingMore(false)
    }
  }, [searchTerm, selectedBodyPart])

  const handleDayToggle = (day: string) => {
    setRutina(prev => {
      const newDaysOfWeek = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
      const newEjerciciosPorDia = { ...prev.ejerciciosPorDia }
      if (!newDaysOfWeek.includes(day)) {
        delete newEjerciciosPorDia[day]
      }
      return { ...prev, daysOfWeek: newDaysOfWeek, ejerciciosPorDia: newEjerciciosPorDia }
    })
  }

  const addEjercicioToDay = (ejercicio: Ejercicio, day: string) => {
    setSelectedEjercicio(ejercicio)
    setSelectedDay(day)
    setShowEjercicioSelector(false)
    setShowEjercicioConfig(true)
  }

  const confirmAddEjercicio = () => {
    if (!selectedEjercicio || !selectedDay) return

    const newEjercicio: RutinaEjercicio = {
      ejercicioId: selectedEjercicio.id,
      ejercicioName: selectedEjercicio.name,
      bodyPart: selectedEjercicio.bodyPart,
      equipment: selectedEjercicio.equipment,
      target: selectedEjercicio.target,
      gifUrl: selectedEjercicio.gifUrl,
      dayOfWeek: selectedDay,
      order: (rutina.ejerciciosPorDia[selectedDay]?.length || 0) + 1,
      sets: ejercicioConfig.sets
    }

    setRutina(prev => ({
      ...prev,
      ejerciciosPorDia: {
        ...prev.ejerciciosPorDia,
        [selectedDay]: [...(prev.ejerciciosPorDia[selectedDay] || []), newEjercicio]
      }
    }))

    setShowEjercicioConfig(false)
    setSelectedEjercicio(null)
    setSelectedDay('')
    setEjercicioConfig({ sets: 3 })
  }

  const removeEjercicioFromDay = (day: string, index: number) => {
    setRutina(prev => ({
      ...prev,
      ejerciciosPorDia: {
        ...prev.ejerciciosPorDia,
        [day]: prev.ejerciciosPorDia[day].filter((_, i) => i !== index)
      }
    }))
  }

  const moveEjercicio = (day: string, index: number, direction: 'up' | 'down') => {
    const ejerciciosDelDia = rutina.ejerciciosPorDia[day] || []
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= ejerciciosDelDia.length) return

    setRutina(prev => {
      const newEjercicios = [...ejerciciosDelDia]
      const [movedItem] = newEjercicios.splice(index, 1)
      newEjercicios.splice(newIndex, 0, movedItem)
      const updated = newEjercicios.map((ej, i) => ({ ...ej, order: i + 1 }))
      return { ...prev, ejerciciosPorDia: { ...prev.ejerciciosPorDia, [day]: updated } }
    })
  }

  const saveRutina = async () => {
    setError('')
    if (!rutina.name.trim()) { setError('El nombre de la rutina es requerido'); return }
    if (rutina.name.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres'); return }
    if (rutina.daysOfWeek.length === 0) { setError('Debes seleccionar al menos un día'); return }

    for (const day of rutina.daysOfWeek) {
      if (!rutina.ejerciciosPorDia[day] || rutina.ejerciciosPorDia[day].length === 0) {
        setError(`El día ${day} debe tener al menos un ejercicio`)
        return
      }
    }

    try {
      setSaving(true)
      const allEjercicios: RutinaEjercicio[] = []
      Object.entries(rutina.ejerciciosPorDia).forEach(([day, ejercicios]) => {
        ejercicios.forEach(ej => allEjercicios.push({ ...ej, dayOfWeek: day }))
      })

      const response = await fetch('/api/rutinas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rutina.name,
          description: rutina.description,
          daysOfWeek: rutina.daysOfWeek,
          ejercicios: allEjercicios,
          isActive: rutina.isActive
        })
      })

      const data = await response.json()
      if (data.success) {
        router.push('/rutinas')
      } else {
        setError(data.error || 'Error al crear rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Rutina</h1>
          <p className="text-gray-600 mt-2">Organiza tus ejercicios por días de la semana</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Información básica */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre de la rutina *</label>
                <input
                  type="text"
                  value={rutina.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) setRutina(prev => ({ ...prev, name: e.target.value }))
                  }}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    rutina.name.trim().length < 3 && rutina.name.length > 0
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Ej: Push Pull Legs, Fullbody, etc."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rutina.name.length}/50 caracteres {rutina.name.trim().length < 3 && rutina.name.length > 0 && '(mínimo 3)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  value={rutina.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) setRutina(prev => ({ ...prev, description: e.target.value }))
                  }}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe tu rutina..."
                />
                <p className="text-xs text-gray-500 mt-1">{rutina.description.length}/200 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Días de entrenamiento *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`p-2 rounded-md text-sm font-medium transition-colors ${
                        rutina.daysOfWeek.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ejercicios por día */}
          {rutina.daysOfWeek.length > 0 && (
            <div className="space-y-6">
              {rutina.daysOfWeek.map((day) => (
                <div key={day} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {generateDayTitle(day, rutina.ejerciciosPorDia[day] || [])}
                    </h3>
                    <button
                      onClick={() => { setSelectedDay(day); setShowEjercicioSelector(true) }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Agregar Ejercicio
                    </button>
                  </div>

                  {!rutina.ejerciciosPorDia[day] || rutina.ejerciciosPorDia[day].length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay ejercicios para este día. Haz clic en &quot;Agregar Ejercicio&quot; para comenzar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rutina.ejerciciosPorDia[day].map((ejercicio, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3">
                              {ejercicio.gifUrl && (
                                <ExerciseImage src={ejercicio.gifUrl} alt={ejercicio.ejercicioName} size="sm" />
                              )}
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-500">#{ejercicio.order}</span>
                                  <h4 className="text-lg font-medium text-gray-900">{ejercicio.ejercicioName}</h4>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {ejercicio.bodyPart} • {ejercicio.equipment}
                                </p>
                                <div className="flex flex-wrap gap-2 text-sm">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                                    {ejercicio.sets} series
                                  </span>
                                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    Peso y reps se anotan al entrenar
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button onClick={() => moveEjercicio(day, index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                                <ChevronUpIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => moveEjercicio(day, index, 'down')} disabled={index === (rutina.ejerciciosPorDia[day]?.length || 0) - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                                <ChevronDownIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => removeEjercicioFromDay(day, index)} className="p-1 text-red-400 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-between bg-white shadow rounded-lg p-6">
            <button
              onClick={() => router.push('/rutinas')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={saveRutina}
              disabled={saving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear Rutina'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal selector de ejercicios */}
      {showEjercicioSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Seleccionar Ejercicio para {selectedDay}
              </h3>
              <button
                onClick={() => { setShowEjercicioSelector(false); setSelectedDay('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Búsqueda + Filtro */}
            <div className="mb-4 space-y-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search exercises..."
                />
              </div>

              <select
                value={selectedBodyPart}
                onChange={(e) => setSelectedBodyPart(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">🎯 All body parts</option>
                {Object.entries(BODY_PART_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Lista de ejercicios */}
            <div className="max-h-96 overflow-y-auto relative">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p>Buscando ejercicios...</p>
                </div>
              ) : !searchTerm && !selectedBodyPart ? (
                <div className="text-center py-8 text-gray-500">
                  <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold mb-1">Busca o filtra ejercicios</p>
                  <p className="text-sm">Selecciona un grupo muscular o escribe para buscar</p>
                </div>
              ) : searchTerm && !selectedBodyPart && searchTerm.length < 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="edit" size={48} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold mb-1">Escribe más caracteres</p>
                  <p className="text-sm">Necesitas al menos 2 letras para buscar</p>
                </div>
              ) : ejercicios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="not-found" size={48} className="mx-auto mb-2 opacity-40" />
                  <p>No se encontraron ejercicios</p>
                  <p className="text-sm mt-1">Prueba con otra búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ejercicios.map((ejercicio) => (
                      <div
                        key={ejercicio.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-all"
                        onClick={() => addEjercicioToDay(ejercicio, selectedDay)}
                      >
                        <div className="flex items-center space-x-3">
                          {ejercicio.gifUrl && (
                            <ExerciseImage src={ejercicio.gifUrl} alt={ejercicio.name} size="sm" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{ejercicio.name}</h4>
                            <p className="text-sm text-gray-500">{ejercicio.bodyPart} • {ejercicio.equipment}</p>
                            <p className="text-sm text-gray-400">{ejercicio.target}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Infinite scroll sentinel */}
                  {ejercicios.length > 0 && (
                    <div ref={observerRef} className="w-full py-4 flex items-center justify-center" style={{ minHeight: '60px' }}>
                      {isFetchingMore && (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className="text-blue-600 text-sm font-medium">Cargando más...</span>
                        </div>
                      )}
                      {!isFetchingMore && hasMore && (
                        <span className="text-gray-400 text-xs">Desplázate para cargar más</span>
                      )}
                      {!hasMore && !loading && (
                        <span className="text-gray-400 text-sm">✓ Todos los ejercicios cargados</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal configuración de ejercicio */}
      {showEjercicioConfig && selectedEjercicio && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configurar Ejercicio</h3>
              <button onClick={() => { setShowEjercicioConfig(false); setSelectedEjercicio(null) }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-4">
                {selectedEjercicio.gifUrl && (
                  <ExerciseImage src={selectedEjercicio.gifUrl} alt={selectedEjercicio.name} size="sm" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{selectedEjercicio.name}</h4>
                  <p className="text-sm text-gray-500">{selectedEjercicio.bodyPart} • {selectedEjercicio.equipment}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <LightBulbIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span><strong>Nota:</strong> Solo defines cuántas series harás de este ejercicio.
                  El peso y repeticiones los anotarás al entrenar.</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">¿Cuántas series? *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ejercicioConfig.sets}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || value === '0') {
                      setEjercicioConfig({ sets: '' as any })
                    } else {
                      const num = parseInt(value)
                      if (num >= 1 && num <= 10) setEjercicioConfig({ sets: num })
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value
                    if (value === '' || value === '0' || parseInt(value) < 1) {
                      setEjercicioConfig({ sets: 1 })
                    }
                  }}
                  className="block w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-gray-500">Ejemplo: Si haces 4 sets de este ejercicio, pon 4</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowEjercicioConfig(false); setSelectedEjercicio(null) }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAddEjercicio}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Agregar Ejercicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}