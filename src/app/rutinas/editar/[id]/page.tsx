'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Ejercicio {
  id: string
  name: string
  nameEs: string
  bodyPart: string
  bodyPartEs: string
  equipment: string
  equipmentEs: string
  target: string
  targetEs: string
  gifUrl: string
  instructions: string[]
}

interface RutinaEjercicio {
  ejercicioId: string
  ejercicioName: string
  ejercicioNameEs: string
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

const BODY_PART_TRANSLATIONS: Record<string, string> = {
  'back': 'Espalda',
  'cardio': 'Cardio',
  'chest': 'Pecho',
  'lower arms': 'Brazos',
  'lower legs': 'Piernas',
  'neck': 'Cuello',
  'shoulders': 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  'waist': 'Core'
}

const generateDayTitle = (day: string, ejercicios: RutinaEjercicio[]): string => {
  if (!ejercicios || ejercicios.length === 0) {
    return day
  }

  const bodyPartCounts: Record<string, number> = {}
  ejercicios.forEach(ejercicio => {
    const translated = BODY_PART_TRANSLATIONS[ejercicio.bodyPart] || ejercicio.bodyPart
    bodyPartCounts[translated] = (bodyPartCounts[translated] || 0) + 1
  })

  const sortedBodyParts = Object.entries(bodyPartCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([part]) => part)
    .slice(0, 3)

  if (sortedBodyParts.length === 0) {
    return day
  }

  const muscleString = sortedBodyParts.join(' y ')
  return `${day} (${muscleString})`
}

export default function EditarRutinaPage() {
  const { user } = useAuth()
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const rutinaId = params?.id as string
  
  const [rutina, setRutina] = useState<RutinaForm>({
    name: '',
    description: '',
    daysOfWeek: [],
    ejerciciosPorDia: {},
    isActive: true
  })
  
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [filteredEjercicios, setFilteredEjercicios] = useState<Ejercicio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState('')
  // Infinite scroll states
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement | null>(null)
  const [showEjercicioSelector, setShowEjercicioSelector] = useState(false)
  const [showEjercicioConfig, setShowEjercicioConfig] = useState(false)
  const [selectedEjercicio, setSelectedEjercicio] = useState<Ejercicio | null>(null)
  const [ejercicioConfig, setEjercicioConfig] = useState({
    sets: 3
  })
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingEjercicios, setLoadingEjercicios] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Cargar rutina existente
  useEffect(() => {
    if (rutinaId) {
      fetchRutina()
    }
  }, [rutinaId])

  // Infinite scroll: Reset offset and results when search/filter changes or modal opens
  useEffect(() => {
    if (!showEjercicioSelector) return
    setOffset(0)
    setHasMore(true)
    setEjercicios([])
    setFilteredEjercicios([])
  }, [showEjercicioSelector, searchTerm, selectedBodyPart])

  // Infinite scroll: Debounced fetch on search/filter/modal open
  useEffect(() => {
    if (!showEjercicioSelector) return
    const debounceTimer = setTimeout(() => {
      fetchEjercicios(0, true)
    }, 500)
    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line
  }, [showEjercicioSelector, searchTerm, selectedBodyPart])

  // Infinite scroll: Observer for sentinel div
  useEffect(() => {
    if (!showEjercicioSelector || !hasMore || loadingEjercicios || isFetchingMore) return
    
    const currentObserverRef = observerRef.current
    if (!currentObserverRef) return

    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore && !loadingEjercicios) {
        fetchEjercicios(offset, false)
      }
    }, { threshold: 0.1, rootMargin: '50px' })
    
    observer.observe(currentObserverRef)
    
    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef)
      }
      observer.disconnect()
    }
    // eslint-disable-next-line
  }, [hasMore, offset, showEjercicioSelector, loadingEjercicios, isFetchingMore])

  const fetchRutina = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/rutinas/${rutinaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        const rutinaData = data.data
        
        // Agrupar ejercicios por día
        const ejerciciosPorDia: Record<string, RutinaEjercicio[]> = {}
        rutinaData.ejercicios.forEach((ej: any) => {
          if (!ejerciciosPorDia[ej.dayOfWeek]) {
            ejerciciosPorDia[ej.dayOfWeek] = []
          }
          ejerciciosPorDia[ej.dayOfWeek].push({
            ejercicioId: ej.ejercicioId,
            ejercicioName: ej.ejercicioName,
            ejercicioNameEs: ej.ejercicioNameEs,
            bodyPart: ej.bodyPart,
            equipment: ej.equipment,
            target: ej.target,
            gifUrl: ej.gifUrl,
            dayOfWeek: ej.dayOfWeek,
            order: ej.order,
            sets: ej.sets || 3
          })
        })

        setRutina({
          name: rutinaData.name,
          description: rutinaData.description || '',
          daysOfWeek: rutinaData.daysOfWeek || [],
          ejerciciosPorDia,
          isActive: rutinaData.isActive
        })
      } else {
        setError('Error al cargar rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // Infinite scroll: Fetch ejercicios with pagination
  const fetchEjercicios = useCallback(async (customOffset = 0, reset = false) => {
    try {
      if (reset) setLoadingEjercicios(true)
      setIsFetchingMore(!reset)
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        limit: '30',
        offset: customOffset.toString()
      })
      if (searchTerm && searchTerm.length >= 1) {
        params.append('search', searchTerm)
      }
      if (selectedBodyPart) {
        params.append('bodyPart', selectedBodyPart)
      }
      if (!searchTerm && !selectedBodyPart) {
        setEjercicios([])
        setFilteredEjercicios([])
        setLoadingEjercicios(false)
        setIsFetchingMore(false)
        setHasMore(false)
        return
      }
      if (searchTerm && !selectedBodyPart && searchTerm.length < 2) {
        setEjercicios([])
        setFilteredEjercicios([])
        setLoadingEjercicios(false)
        setIsFetchingMore(false)
        setHasMore(false)
        return
      }
      const response = await fetch(`/api/ejercicios?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        if (reset) {
          setEjercicios(data.data || [])
          setFilteredEjercicios(data.data || [])
        } else {
          setEjercicios(prev => [...prev, ...(data.data || [])])
          setFilteredEjercicios(prev => [...prev, ...(data.data || [])])
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
      setLoadingEjercicios(false)
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
      
      return {
        ...prev,
        daysOfWeek: newDaysOfWeek,
        ejerciciosPorDia: newEjerciciosPorDia
      }
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
      ejercicioNameEs: selectedEjercicio.nameEs,
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
      
      const updatedEjercicios = newEjercicios.map((ejercicio, i) => ({
        ...ejercicio,
        order: i + 1
      }))

      return {
        ...prev,
        ejerciciosPorDia: {
          ...prev.ejerciciosPorDia,
          [day]: updatedEjercicios
        }
      }
    })
  }

  const saveRutina = async () => {
    setError('')
    
    if (!rutina.name.trim()) {
      setError('El nombre de la rutina es requerido')
      return
    }

    if (rutina.name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres')
      return
    }

    if (rutina.daysOfWeek.length === 0) {
      setError('Debes seleccionar al menos un día de la semana')
      return
    }

    const totalEjercicios = Object.values(rutina.ejerciciosPorDia).reduce(
      (acc, ejercicios) => acc + ejercicios.length, 0
    )

    if (totalEjercicios === 0) {
      setError('Debes agregar al menos un ejercicio a la rutina')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('accessToken')
      
      const allEjercicios = Object.values(rutina.ejerciciosPorDia).flat()

      const response = await fetch(`/api/rutinas/${rutinaId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
        // Mostrar mensaje de éxito sin redirigir
        setError('')
        setSuccessMessage('✅ Rutina actualizada correctamente')
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.error || 'Error al actualizar rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const BODY_PARTS_MAP: Record<string, string> = {
    'back': 'Espalda',
    'cardio': 'Cardio',
    'chest': 'Pecho',
    'lower arms': 'Antebrazos',
    'lower legs': 'Piernas Inf.',
    'neck': 'Cuello',
    'shoulders': 'Hombros',
    'upper arms': 'Brazos',
    'upper legs': 'Piernas',
    'waist': 'Core'
  }
  
  const bodyParts = ['back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs', 'waist']

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">✏️ Editar Rutina</h1>
          <p className="text-gray-600">Modifica tu rutina de entrenamiento</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <span>{successMessage}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Información básica */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Información Básica
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre de la rutina *
                </label>
                <input
                  type="text"
                  value={rutina.name}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 50) {
                      setRutina(prev => ({ ...prev, name: value }))
                    }
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
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={rutina.description}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 200) {
                      setRutina(prev => ({ ...prev, description: value }))
                    }
                  }}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe tu rutina..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rutina.description.length}/200 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de entrenamiento *
                </label>
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
                      onClick={() => {
                        setSelectedDay(day)
                        setShowEjercicioSelector(true)
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Agregar Ejercicio
                    </button>
                  </div>

                  {rutina.ejerciciosPorDia[day]?.length === 0 || !rutina.ejerciciosPorDia[day] ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay ejercicios para este día. Haz clic en "Agregar Ejercicio" para comenzar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rutina.ejerciciosPorDia[day].map((ejercicio, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3">
                              {ejercicio.gifUrl && (
                                <img
                                  src={ejercicio.gifUrl}
                                  alt={ejercicio.ejercicioNameEs}
                                  className="w-16 h-16 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-500">
                                    #{ejercicio.order}
                                  </span>
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {ejercicio.ejercicioNameEs || ejercicio.ejercicioName}
                                  </h4>
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
                              <button
                                onClick={() => moveEjercicio(day, index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ChevronUpIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => moveEjercicio(day, index, 'down')}
                                disabled={index === rutina.ejerciciosPorDia[day].length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ChevronDownIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => removeEjercicioFromDay(day, index)}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <TrashIcon className="h-5 w-5" />
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
          <div className="flex items-center justify-end space-x-4 bg-white shadow rounded-lg p-6">
            <button
              onClick={() => router.push('/rutinas')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveRutina}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Modal de selección de ejercicios */}
        {showEjercicioSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Seleccionar Ejercicio para {selectedDay}
                </h2>
                <button
                  onClick={() => setShowEjercicioSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 border-b space-y-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o músculo..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedBodyPart('')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedBodyPart === ''
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  {bodyParts.map((part) => (
                    <button
                      key={part}
                      onClick={() => setSelectedBodyPart(part)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedBodyPart === part
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {BODY_PARTS_MAP[part] || part}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingEjercicios ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : !searchTerm && !selectedBodyPart ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="font-semibold mb-1 text-gray-700">Busca o filtra ejercicios</p>
                    <p className="text-sm text-gray-500">Selecciona un grupo muscular o escribe para buscar</p>
                  </div>
                ) : searchTerm && !selectedBodyPart && searchTerm.length < 2 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">✍️</div>
                    <p className="font-semibold mb-1 text-gray-700">Escribe más caracteres</p>
                    <p className="text-sm text-gray-500">Necesitas al menos 2 letras para buscar</p>
                  </div>
                ) : filteredEjercicios.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">😕</div>
                    <p className="text-gray-700">No se encontraron ejercicios</p>
                    <p className="text-sm text-gray-500 mt-1">Prueba con otra búsqueda</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredEjercicios.map((ejercicio) => (
                        <div
                          key={ejercicio.id}
                          onClick={() => addEjercicioToDay(ejercicio, selectedDay)}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            {ejercicio.gifUrl && (
                              <img
                                src={ejercicio.gifUrl}
                                alt={ejercicio.nameEs}
                                className="w-20 h-20 rounded object-cover"
                                loading="lazy"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {ejercicio.nameEs || ejercicio.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {ejercicio.bodyPartEs || ejercicio.bodyPart}
                              </p>
                              <p className="text-xs text-gray-500">
                                {ejercicio.equipmentEs || ejercicio.equipment}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Infinite scroll sentinel */}
                    {filteredEjercicios.length > 0 && (
                      <div 
                        ref={observerRef} 
                        className="w-full py-4 flex items-center justify-center"
                        style={{ minHeight: '60px' }}
                      >
                        {isFetchingMore && (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="text-blue-600 text-sm font-medium">Cargando más ejercicios...</span>
                          </div>
                        )}
                        {!isFetchingMore && hasMore && (
                          <span className="text-gray-400 text-xs">Desplázate para cargar más</span>
                        )}
                        {!hasMore && !loadingEjercicios && (
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

        {/* Modal de configuración de ejercicio */}
        {showEjercicioConfig && selectedEjercicio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Configurar Ejercicio
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedEjercicio.nameEs || selectedEjercicio.name}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Nota:</strong> Solo defines cuántas series harás de este ejercicio. 
                    El peso y repeticiones los anotarás al entrenar.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Cuántas series? *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ejercicioConfig.sets}
                    onChange={(e) => setEjercicioConfig({ 
                      sets: parseInt(e.target.value) || 1 
                    })}
                    className="block w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Ejemplo: Si haces 4 sets de este ejercicio, pon 4
                  </p>
                </div>
              </div>

              <div className="p-6 border-t flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEjercicioConfig(false)
                    setSelectedEjercicio(null)
                    setEjercicioConfig({ sets: 3 })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAddEjercicio}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar Ejercicio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
