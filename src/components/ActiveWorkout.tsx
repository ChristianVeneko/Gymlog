'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { getLocalDate, getLocalDayOfWeek, getBrowserTimezone } from '@/lib/utils/dateUtils'
import SetInputRow from '@/components/SetInputRow'

interface Exercise {
  id: string
  name: string
  nameEs: string
  bodyPart: string
  equipment: string
  gifUrl: string
  sets: number
  reps: number
}

interface SetData {
  setNumber: number
  ejercicioId: string
  weight?: number
  reps?: number
  completed: boolean
  fallo: boolean
  notes?: string
}

interface ActiveWorkout {
  id: string
  rutinaId: string
  rutinaName: string
  rutinaDescription?: string
  fecha: string
  exercises: Exercise[]
  sets: SetData[]
}

export default function ActiveWorkout() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [localSets, setLocalSets] = useState<SetData[]>([])
  const [syncing, setSyncing] = useState(false)
  const [finishing, setFinishing] = useState(false) // ✅ NUEVO: Estado de finalización
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [rutinas, setRutinas] = useState<any[]>([])
  const [selectedRutinaId, setSelectedRutinaId] = useState<string>('')
  const [showRutinaSelector, setShowRutinaSelector] = useState(false)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [manualDuration, setManualDuration] = useState<number>(60) // duración en minutos
  const syncInProgressRef = useRef(false) // Guard contra syncs concurrentes
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null) // Referencia al interval para poder limpiarlo
  const abortControllerRef = useRef<AbortController | null>(null) // AbortController para cancelar fetches en vuelo

  // Cargar rutinas disponibles
  useEffect(() => {
    const fetchRutinas = async () => {
      try {
        const response = await fetch('/api/rutinas?include_ejercicios=true&active=true', {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success) {
          setRutinas(data.data || [])
        }
      } catch (error) {
        console.error('Error loading rutinas:', error)
      }
    }
    fetchRutinas()
  }, [])

  // Cargar entrenamiento activo del día
  const loadActiveWorkout = useCallback(async () => {
    try {
      // ✅ CORREGIDO: Usar fecha local de Venezuela
      const today = getLocalDate()
      
      const response = await fetch(`/api/entrenamientos/active?fecha=${today}`, {
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setActiveWorkout(data.data)
        
        // Cargar sets desde localStorage si existen (persistencia local)
        const savedSets = localStorage.getItem(`workout_${data.data.id}_sets`)
        if (savedSets) {
          setLocalSets(JSON.parse(savedSets))
        } else {
          setLocalSets(data.data.sets || [])
        }
      } else {
        setActiveWorkout(null)
        setShowRutinaSelector(true)
      }
    } catch (error) {
      console.error('Error loading active workout:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActiveWorkout()
  }, [loadActiveWorkout])

  // Sincronización automática con DB cada 10 segundos
  useEffect(() => {
    if (!activeWorkout) return

    syncIntervalRef.current = setInterval(async () => {
      await syncSetsToServer()
    }, 10000) // 10 segundos

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      // Abortar cualquier request en vuelo al desmontarse
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [activeWorkout, localSets])

  // Guardar sets en localStorage inmediatamente
  useEffect(() => {
    if (activeWorkout && localSets.length > 0) {
      localStorage.setItem(`workout_${activeWorkout.id}_sets`, JSON.stringify(localSets))
    }
  }, [localSets, activeWorkout])

  // Sincronizar sets con el servidor (protegido contra ejecución concurrente)
  const syncSetsToServer = async () => {
    if (!activeWorkout || localSets.length === 0) return
    
    // Guard: si ya hay un sync en progreso, no iniciar otro
    if (syncInProgressRef.current) return
    
    // Cancelar cualquier request previo que siga pendiente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    try {
      syncInProgressRef.current = true
      setSyncing(true)
      
      const response = await fetch(`/api/entrenamientos/${activeWorkout.id}/sets`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: localSets }),
        signal: controller.signal
      })

      if (response.ok) {
        setLastSync(new Date())
      }
    } catch (error) {
      // Ignorar errores de abort (son intencionales)
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Error syncing sets:', error)
    } finally {
      syncInProgressRef.current = false
      abortControllerRef.current = null
      setSyncing(false)
    }
  }

  // Iniciar nuevo entrenamiento con una rutina
  const startWorkout = async (rutinaId: string) => {
    try {
      // ✅ CORREGIDO: Usar fecha local de Venezuela
      const today = getLocalDate()
      
      // ✅ NUEVO: Verificar si ya existe un entrenamiento de esta rutina hoy
      const checkResponse = await fetch(`/api/entrenamientos?fecha=${today}&rutinaId=${rutinaId}`, {
        credentials: 'include'
      })
      
      const checkData = await checkResponse.json()
      
      if (checkData.success && checkData.data && checkData.data.length > 0) {
        // Ya existe un entrenamiento de esta rutina hoy
        alert('Ya has entrenado esta rutina hoy. Solo puedes entrenar cada rutina una vez por día.')
        return
      }
      
      const response = await fetch('/api/entrenamientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'credentials': 'include',
          'X-Timezone': getBrowserTimezone()
        },
        body: JSON.stringify({
          rutinaId,
          fecha: today
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadActiveWorkout()
        setShowRutinaSelector(false)
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error starting workout:', error)
      alert('Error al iniciar entrenamiento')
    }
  }

  // Actualizar un set específico
  const updateSet = (ejercicioId: string, setNumber: number, field: keyof SetData, value: any) => {
    setLocalSets(prevSets => {
      const existingSetIndex = prevSets.findIndex(
        s => s.ejercicioId === ejercicioId && s.setNumber === setNumber
      )

      if (existingSetIndex >= 0) {
        // Actualizar set existente
        const newSets = [...prevSets]
        newSets[existingSetIndex] = {
          ...newSets[existingSetIndex],
          [field]: value
        }
        return newSets
      } else {
        // Crear nuevo set
        return [
          ...prevSets,
          {
            ejercicioId,
            setNumber,
            completed: false,
            fallo: false,
            [field]: value
          } as SetData
        ]
      }
    })
  }

  // Obtener datos de un set específico
  const getSetData = (ejercicioId: string, setNumber: number): SetData | undefined => {
    return localSets.find(s => s.ejercicioId === ejercicioId && s.setNumber === setNumber)
  }

  // Marcar set como completado
  const toggleSetCompleted = (ejercicioId: string, setNumber: number) => {
    const setData = getSetData(ejercicioId, setNumber)
    updateSet(ejercicioId, setNumber, 'completed', !setData?.completed)
  }

  // Abrir diálogo de finalización
  const openFinishDialog = () => {
    setShowFinishDialog(true)
  }

  // Finalizar entrenamiento con duración manual
  const finishWorkout = async () => {
    if (!activeWorkout || finishing) return
    
    try {
      setFinishing(true)
      
      // 1. Detener el intervalo de sync automático para evitar race conditions
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      
      // 2. Esperar a que termine cualquier sync en progreso
      while (syncInProgressRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      
      // 3. Hacer el sync final de sets (secuencial, no paralelo)
      if (localSets.length > 0) {
        await syncSetsToServer()
      }
      
      // 4. Finalizar el entrenamiento (después del sync)
      await fetch(`/api/entrenamientos/${activeWorkout.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          duration: manualDuration
        })
      })

      // 5. Limpiar estado local
      localStorage.removeItem(`workout_${activeWorkout.id}_sets`)
      setActiveWorkout(null)
      setLocalSets([])
      setShowRutinaSelector(true)
      setShowFinishDialog(false)
      setManualDuration(60)
      
      // 6. Disparar evento para actualizar dashboard
      window.dispatchEvent(new CustomEvent('workoutFinished'))
      
    } catch (error) {
      console.error('Error finishing workout:', error)
      alert('Error al finalizar entrenamiento. Por favor intenta de nuevo.')
    } finally {
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Selector de rutina para iniciar entrenamiento
  if (!activeWorkout || showRutinaSelector) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">🏋️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Entrenamiento de Hoy</h2>
        </div>

        {rutinas.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📝</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No tienes rutinas</h3>
            <p className="text-gray-600 mb-4 text-sm">Crea tu primera rutina</p>
            <a
              href="/rutinas/crear"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold"
            >
              Crear Rutina
            </a>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4 text-sm">Selecciona la rutina para hoy:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rutinas.map(rutina => {
                // ✅ CORREGIDO: Usar zona horaria local (Venezuela)
                const diaActual = getLocalDayOfWeek()
                
                // Contar ejercicios para hoy
                const ejerciciosHoy = rutina.ejercicios?.filter((ej: any) => {
                  return ej.dayOfWeek === diaActual
                }) || []
                
                // Mapeo de bodyParts en inglés a español
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
                
                // Contar músculos trabajados hoy
                const musculosContados: Record<string, number> = {}
                ejerciciosHoy.forEach((ej: any) => {
                  const bodyPart = ej.bodyPart || ej.ejercicio?.bodyPart
                  if (bodyPart) {
                    const translated = BODY_PART_TRANSLATIONS[bodyPart] || bodyPart
                    musculosContados[translated] = (musculosContados[translated] || 0) + 1
                  }
                })
                
                // Obtener los 2 músculos más trabajados
                const musculosPrincipales = Object.entries(musculosContados)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 2)
                  .map(([musculo]) => musculo)
                  .join(' y ') || 'N/A'
                
                return (
                  <button
                    key={rutina.id}
                    onClick={() => startWorkout(rutina.id)}
                    className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <h3 className="font-bold text-gray-900 mb-1">
                      {rutina.name}
                    </h3>
                    <p className="text-gray-600 text-xs mb-2">{rutina.description || 'Sin descripción'}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold">{diaActual}:</span> {ejerciciosHoy.length} ejercicios • {musculosPrincipales}
                      </div>
                      <span className="text-blue-600 font-bold text-sm">
                        Iniciar →
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // Vista del entrenamiento activo
  const completedSets = localSets.filter(s => s.completed).length
  const totalSets = activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets, 0)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      {/* Header simple */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">🏋️</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{activeWorkout.rutinaName}</h2>
            {activeWorkout.rutinaDescription && (
              <p className="text-gray-500 text-xs mb-1">{activeWorkout.rutinaDescription}</p>
            )}
            <p className="text-gray-600 text-sm font-semibold">
              {completedSets} / {totalSets} series completadas
              {syncing && <span className="ml-2 text-blue-600">⏳</span>}
              {lastSync && !syncing && <span className="ml-2 text-green-600">✅</span>}
            </p>
          </div>
        </div>
        <button
          onClick={openFinishDialog}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all font-bold"
        >
          ✅ Finalizar
        </button>
      </div>

      {/* Tabla de ejercicios - DISEÑO LIMPIO */}
      <div className="space-y-4">
        {activeWorkout.exercises.map((exercise) => (
          <div key={exercise.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            {/* Header del ejercicio */}
            <div className="flex items-center mb-3 pb-3 border-b border-gray-200">
              {exercise.gifUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 mr-3 flex-shrink-0">
                  <img
                    src={exercise.gifUrl}
                    alt={exercise.nameEs}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{exercise.nameEs}</h3>
                <p className="text-sm text-gray-600">{exercise.bodyPart}</p>
              </div>
            </div>

            {/* Tabla adaptativa: compacta en PC, espaciosa en móvil */}
            <div className="space-y-3 md:space-y-2">
              {Array.from({ length: exercise.sets }, (_, i) => {
                const setNumber = i + 1
                const setData = getSetData(exercise.id, setNumber)
                const isCompleted = setData?.completed || false

                return (
                  <SetInputRow
                    key={setNumber}
                    setNumber={setNumber}
                    weight={setData?.weight}
                    reps={setData?.reps}
                    notes={setData?.notes || ''}
                    fallo={setData?.fallo || false}
                    isCompleted={isCompleted}
                    onWeightChange={(v) => updateSet(exercise.id, setNumber, 'weight', v)}
                    onRepsChange={(v) => updateSet(exercise.id, setNumber, 'reps', v)}
                    onNotesChange={(v) => updateSet(exercise.id, setNumber, 'notes', v)}
                    onFalloChange={(v) => updateSet(exercise.id, setNumber, 'fallo', v)}
                    onToggleCompleted={() => toggleSetCompleted(exercise.id, setNumber)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de finalización con duración manual */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                ✅ Finalizar Entrenamiento
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                ¿Cuánto tiempo duraste entrenando?
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={manualDuration}
                  onChange={(e) => {
                    const value = e.target.value
                    // Permitir vacío temporalmente o número válido
                    if (value === '' || value === '0') {
                      setManualDuration('' as any)
                    } else {
                      const num = parseInt(value)
                      if (num >= 1 && num <= 300) {
                        setManualDuration(num)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Al perder foco, si está vacío, poner 60
                    const value = e.target.value
                    if (value === '' || value === '0' || parseInt(value) < 1) {
                      setManualDuration(60)
                    }
                  }}
                  className="block w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="60"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Ejemplo: Si entrenaste 45 minutos, pon 45
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ⏱️ <strong>{manualDuration} minutos</strong> = {Math.floor(manualDuration / 60)}h {manualDuration % 60}m
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ <strong>{completedSets} de {totalSets} series</strong> completadas
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFinishDialog(false)
                  setManualDuration(60)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={finishWorkout}
                disabled={finishing}
                className={`px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold flex items-center gap-2 ${
                  finishing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {finishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>✅ Guardar y Finalizar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
