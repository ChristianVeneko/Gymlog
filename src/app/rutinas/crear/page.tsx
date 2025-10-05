'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  sets: number  // SOLO cantidad de series, NO peso/reps
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

// Mapeo de bodyParts en inglés a español simplificado
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

// Función para generar título de día basado en músculos trabajados
const generateDayTitle = (day: string, ejercicios: RutinaEjercicio[]): string => {
  if (!ejercicios || ejercicios.length === 0) {
    return day
  }

  // Contar frecuencia de cada bodyPart
  const bodyPartCounts: Record<string, number> = {}
  ejercicios.forEach(ejercicio => {
    const translated = BODY_PART_TRANSLATIONS[ejercicio.bodyPart] || ejercicio.bodyPart
    bodyPartCounts[translated] = (bodyPartCounts[translated] || 0) + 1
  })

  // Ordenar por frecuencia y tomar los top 2-3
  const sortedBodyParts = Object.entries(bodyPartCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([part]) => part)
    .slice(0, 3)

  if (sortedBodyParts.length === 0) {
    return day
  }

  // Crear título compacto
  const muscleString = sortedBodyParts.join(' y ')
  return `${day} (${muscleString})`
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
  const [filteredEjercicios, setFilteredEjercicios] = useState<Ejercicio[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState('')
  const [showEjercicioSelector, setShowEjercicioSelector] = useState(false)
  const [showEjercicioConfig, setShowEjercicioConfig] = useState(false)
  const [selectedEjercicio, setSelectedEjercicio] = useState<Ejercicio | null>(null)
  const [ejercicioConfig, setEjercicioConfig] = useState({
    sets: 3  // SOLO cantidad de series
  })
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ⚡ OPTIMIZACIÓN: Búsqueda dinámica con debounce
  useEffect(() => {
    if (!showEjercicioSelector) return

    const debounceTimer = setTimeout(() => {
      fetchEjercicios()
    }, 500) // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(debounceTimer)
  }, [showEjercicioSelector, searchTerm, selectedBodyPart])

  const fetchEjercicios = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      
      const params = new URLSearchParams({
        limit: '50' // ⚡ OPTIMIZADO: Solo cargar 50 ejercicios por búsqueda
      })
      
      // Agregar término de búsqueda si existe (sin mínimo si hay filtro de bodyPart)
      if (searchTerm && searchTerm.length >= 1) {
        params.append('search', searchTerm)
      }
      
      // Agregar filtro de grupo muscular si existe
      if (selectedBodyPart) {
        params.append('bodyPart', selectedBodyPart)
      }

      // Si no hay búsqueda ni filtro, mostrar mensaje al usuario
      if (!searchTerm && !selectedBodyPart) {
        setEjercicios([])
        setFilteredEjercicios([])
        setLoading(false)
        return
      }

      // Si solo hay searchTerm, requerir mínimo 2 caracteres
      if (searchTerm && !selectedBodyPart && searchTerm.length < 2) {
        setEjercicios([])
        setFilteredEjercicios([])
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/ejercicios?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        // Los ejercicios ya vienen filtrados desde el API
        setEjercicios(data.data || [])
        setFilteredEjercicios(data.data || [])
      } else {
        setError('Error al cargar ejercicios')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // ⚡ ELIMINADO: Ya no necesitamos filtrar en el cliente
  // Los ejercicios ya vienen filtrados desde el API
  const filterEjercicios = () => {
    // Deprecated - filtering now happens server-side
    setFilteredEjercicios(ejercicios)
  }

  // Mantener por compatibilidad pero no hace nada real
  const oldFilterEjercicios = () => {
    let filtered = ejercicios

    if (searchTerm) {
      filtered = filtered.filter(ejercicio => 
        ejercicio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ejercicio.nameEs?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ejercicio.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ejercicio.bodyPartEs.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedBodyPart) {
      filtered = filtered.filter(ejercicio => 
        ejercicio.bodyPart === selectedBodyPart
      )
    }

    setFilteredEjercicios(filtered)
  }

  const handleDayToggle = (day: string) => {
    setRutina(prev => {
      const newDaysOfWeek = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
      
      // Si se deselecciona un día, eliminar sus ejercicios
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
      sets: ejercicioConfig.sets  // SOLO cantidad de series
    }

    setRutina(prev => ({
      ...prev,
      ejerciciosPorDia: {
        ...prev.ejerciciosPorDia,
        [selectedDay]: [...(prev.ejerciciosPorDia[selectedDay] || []), newEjercicio]
      }
    }))

    // Reset
    setShowEjercicioConfig(false)
    setSelectedEjercicio(null)
    setSelectedDay('')
    setEjercicioConfig({
      sets: 3  // SOLO series
    })
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
      
      // Actualizar orden
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
    
    // Validaciones
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

    // Verificar que cada día seleccionado tenga al menos un ejercicio
    for (const day of rutina.daysOfWeek) {
      if (!rutina.ejerciciosPorDia[day] || rutina.ejerciciosPorDia[day].length === 0) {
        setError(`El día ${day} debe tener al menos un ejercicio`)
        return
      }
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('accessToken')
      
      // Convertir ejercicios por día a un array plano
      const allEjercicios: RutinaEjercicio[] = []
      Object.entries(rutina.ejerciciosPorDia).forEach(([day, ejercicios]) => {
        ejercicios.forEach(ejercicio => {
          allEjercicios.push({
            ...ejercicio,
            dayOfWeek: day
          })
        })
      })
      
      const response = await fetch('/api/rutinas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
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
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <ChevronUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveEjercicio(day, index, 'down')}
                                disabled={index === (rutina.ejerciciosPorDia[day]?.length || 0) - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <ChevronDownIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeEjercicioFromDay(day, index)}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
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
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            <button
              onClick={saveRutina}
              disabled={saving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
                onClick={() => {
                  setShowEjercicioSelector(false)
                  setSelectedDay('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Búsqueda */}
            <div className="mb-4 space-y-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Buscar ejercicios..."
                />
              </div>
              
              <select
                value={selectedBodyPart}
                onChange={(e) => setSelectedBodyPart(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">🎯 Todas las partes del cuerpo</option>
                <option value="chest">💪 Pecho</option>
                <option value="back">🔱 Espalda</option>
                <option value="shoulders">🏋️ Hombros</option>
                <option value="upper arms">💪 Brazos</option>
                <option value="lower arms">🤜 Antebrazos</option>
                <option value="upper legs">🦵 Piernas</option>
                <option value="lower legs">🦿 Pantorrillas</option>
                <option value="waist">🔥 Abdominales/Core</option>
                <option value="neck">🗿 Cuello</option>
                <option value="cardio">❤️ Cardio</option>
              </select>
            </div>

            {/* Lista de ejercicios */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <p>Buscando ejercicios...</p>
                </div>
              ) : !searchTerm && !selectedBodyPart ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="font-semibold mb-1">Busca o filtra ejercicios</p>
                  <p className="text-sm">Selecciona un grupo muscular o escribe para buscar</p>
                </div>
              ) : searchTerm && !selectedBodyPart && searchTerm.length < 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✍️</div>
                  <p className="font-semibold mb-1">Escribe más caracteres</p>
                  <p className="text-sm">Necesitas al menos 2 letras para buscar</p>
                </div>
              ) : filteredEjercicios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">😕</div>
                  <p>No se encontraron ejercicios</p>
                  <p className="text-sm mt-1">Prueba con otra búsqueda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEjercicios.map((ejercicio) => (
                    <div
                      key={ejercicio.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-all"
                      onClick={() => addEjercicioToDay(ejercicio, selectedDay)}
                    >
                      <div className="flex items-center space-x-3">
                        {ejercicio.gifUrl && (
                          <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={ejercicio.gifUrl}
                              alt={ejercicio.nameEs}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {ejercicio.nameEs || ejercicio.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {ejercicio.bodyPartEs} • {ejercicio.equipmentEs}
                          </p>
                          <p className="text-sm text-gray-400">
                            {ejercicio.targetEs}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
              <h3 className="text-lg font-medium text-gray-900">
                Configurar Ejercicio
              </h3>
              <button
                onClick={() => {
                  setShowEjercicioConfig(false)
                  setSelectedEjercicio(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-4">
                {selectedEjercicio.gifUrl && (
                  <img
                    src={selectedEjercicio.gifUrl}
                    alt={selectedEjercicio.nameEs}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedEjercicio.nameEs || selectedEjercicio.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedEjercicio.bodyPartEs} • {selectedEjercicio.equipmentEs}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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
                  onChange={(e) => {
                    const value = e.target.value
                    // Permitir vacío temporalmente o número válido
                    if (value === '' || value === '0') {
                      setEjercicioConfig({ sets: '' as any })
                    } else {
                      const num = parseInt(value)
                      if (num >= 1 && num <= 10) {
                        setEjercicioConfig({ sets: num })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Al perder foco, si está vacío o es 0, poner 1
                    const value = e.target.value
                    if (value === '' || value === '0' || parseInt(value) < 1) {
                      setEjercicioConfig({ sets: 1 })
                    }
                  }}
                  className="block w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Ejemplo: Si haces 4 sets de este ejercicio, pon 4
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEjercicioConfig(false)
                  setSelectedEjercicio(null)
                }}
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