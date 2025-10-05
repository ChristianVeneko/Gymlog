'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import { 
  PlayIcon, 
  PauseIcon, 
  CheckIcon, 
  ClockIcon,
  FireIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

interface RutinaEjercicio {
  id: string
  ejercicioId: string
  sets: number
  reps: string
  weight: number
  restTime: number
  order: number
  notes: string
  ejercicio: {
    id: string
    name: string
    nameEs: string
    bodyPart: string
    equipment: string
    target: string
    gifUrl: string
  }
}

interface Rutina {
  id: string
  name: string
  description: string
  ejercicios: RutinaEjercicio[]
}

interface Set {
  id?: string
  setNumber: number
  reps?: number
  weight?: number
  duration?: number
  completed: boolean
  restTime?: number
  rpe?: number
  notes?: string
}

interface EntrenamientoActivo {
  currentExerciseIndex: number
  currentSetIndex: number
  sets: Record<string, Set[]> // ejercicioId -> sets
  startTime: Date
  isRestTime: boolean
  restTimeLeft: number
  totalTime: number
}

export default function EntrenarPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  useAuthGuard()
  const rutinaId = params.id as string

  const [rutina, setRutina] = useState<Rutina | null>(null)
  const [entrenamiento, setEntrenamiento] = useState<EntrenamientoActivo | null>(null)
  const [entrenamientoId, setEntrenamientoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRPEModal, setShowRPEModal] = useState(false)
  const [currentRPE, setCurrentRPE] = useState(5)
  
  const restTimerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchRutina()
  }, [rutinaId])

  useEffect(() => {
    if (entrenamiento) {
      // Timer para tiempo total
      totalTimerRef.current = setInterval(() => {
        setEntrenamiento(prev => prev ? {
          ...prev,
          totalTime: Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
        } : null)
      }, 1000)

      return () => {
        if (totalTimerRef.current) {
          clearInterval(totalTimerRef.current)
        }
      }
    }
  }, [entrenamiento])

  useEffect(() => {
    if (entrenamiento?.isRestTime && entrenamiento.restTimeLeft > 0) {
      restTimerRef.current = setTimeout(() => {
        setEntrenamiento(prev => prev ? {
          ...prev,
          restTimeLeft: prev.restTimeLeft - 1
        } : null)
      }, 1000)

      return () => {
        if (restTimerRef.current) {
          clearTimeout(restTimerRef.current)
        }
      }
    } else if (entrenamiento?.isRestTime && entrenamiento.restTimeLeft === 0) {
      // Fin del descanso
      setEntrenamiento(prev => prev ? {
        ...prev,
        isRestTime: false,
        restTimeLeft: 0
      } : null)
      
      // Notificación o sonido
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('¡Descanso terminado!', {
          body: 'Es hora de continuar con el siguiente set',
          icon: '/icon-192x192.png'
        })
      }
    }
  }, [entrenamiento?.isRestTime, entrenamiento?.restTimeLeft])

  const fetchRutina = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/rutinas?include_ejercicios=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        const targetRutina = data.data.find((r: Rutina) => r.id === rutinaId)
        if (targetRutina) {
          setRutina(targetRutina)
          initializeEntrenamiento(targetRutina)
        } else {
          setError('Rutina no encontrada')
        }
      } else {
        setError(data.error || 'Error al cargar rutina')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const initializeEntrenamiento = async (rutina: Rutina) => {
    try {
      const token = localStorage.getItem('accessToken')
      
      // Crear entrenamiento en la base de datos
      const response = await fetch('/api/entrenamientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rutinaId: rutina.id,
          fecha: new Date().toISOString().split('T')[0],
          notes: ''
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setEntrenamientoId(data.data.id)
        
        // Inicializar estado del entrenamiento
        const sets: Record<string, Set[]> = {}
        rutina.ejercicios.forEach(ejercicio => {
          sets[ejercicio.ejercicioId] = Array.from({ length: ejercicio.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: undefined,
            weight: ejercicio.weight || undefined,
            completed: false,
            restTime: ejercicio.restTime
          }))
        })

        setEntrenamiento({
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          sets,
          startTime: new Date(),
          isRestTime: false,
          restTimeLeft: 0,
          totalTime: 0
        })

        // Solicitar permisos de notificación
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission()
        }
      } else {
        setError('Error al iniciar entrenamiento')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const completeSet = async (exerciseIndex: number, setIndex: number, setData: Partial<Set>) => {
    if (!entrenamiento || !rutina || !entrenamientoId) return

    const ejercicio = rutina.ejercicios[exerciseIndex]
    const setToComplete = {
      ...entrenamiento.sets[ejercicio.ejercicioId][setIndex],
      ...setData,
      completed: true
    }

    try {
      const token = localStorage.getItem('token')
      
      // Guardar set en la base de datos
      const response = await fetch('/api/sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entrenamientoId,
          ejercicioId: ejercicio.ejercicioId,
          setNumber: setToComplete.setNumber,
          reps: setToComplete.reps,
          weight: setToComplete.weight,
          duration: setToComplete.duration,
          completed: true,
          restTime: setToComplete.restTime,
          rpe: setToComplete.rpe,
          notes: setToComplete.notes || ''
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Actualizar estado local
        setEntrenamiento(prev => {
          if (!prev) return null
          
          const newSets = { ...prev.sets }
          newSets[ejercicio.ejercicioId][setIndex] = {
            ...setToComplete,
            id: data.data.id
          }

          // Determinar siguiente set o ejercicio
          let nextExerciseIndex = exerciseIndex
          let nextSetIndex = setIndex + 1

          // Si completamos todos los sets del ejercicio actual
          if (nextSetIndex >= ejercicio.sets) {
            nextExerciseIndex = exerciseIndex + 1
            nextSetIndex = 0
          }

          // Iniciar descanso si no es el último set del último ejercicio
          const isLastSetOfLastExercise = 
            exerciseIndex === rutina.ejercicios.length - 1 && 
            setIndex === ejercicio.sets - 1

          return {
            ...prev,
            sets: newSets,
            currentExerciseIndex: nextExerciseIndex,
            currentSetIndex: nextSetIndex,
            isRestTime: !isLastSetOfLastExercise,
            restTimeLeft: !isLastSetOfLastExercise ? (setToComplete.restTime || 60) : 0
          }
        })
      } else {
        setError('Error al guardar set')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const skipRest = () => {
    setEntrenamiento(prev => prev ? {
      ...prev,
      isRestTime: false,
      restTimeLeft: 0
    } : null)
  }

  const addRestTime = (seconds: number) => {
    setEntrenamiento(prev => prev ? {
      ...prev,
      restTimeLeft: prev.restTimeLeft + seconds
    } : null)
  }

  const finishWorkout = async () => {
    if (!entrenamientoId) return

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/entrenamientos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: entrenamientoId,
          completed: true,
          endTime: new Date().toTimeString().slice(0, 5),
          duration: entrenamiento?.totalTime
        })
      })

      const data = await response.json()
      
      if (data.success) {
        router.push('/dashboard')
      } else {
        setError('Error al finalizar entrenamiento')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentSet = () => {
    if (!entrenamiento || !rutina) return null
    
    if (entrenamiento.currentExerciseIndex >= rutina.ejercicios.length) {
      return null // Entrenamiento terminado
    }

    const currentExercise = rutina.ejercicios[entrenamiento.currentExerciseIndex]
    const currentSet = entrenamiento.sets[currentExercise.ejercicioId][entrenamiento.currentSetIndex]
    
    return {
      exercise: currentExercise,
      set: currentSet,
      exerciseIndex: entrenamiento.currentExerciseIndex,
      setIndex: entrenamiento.currentSetIndex
    }
  }

  const isWorkoutComplete = () => {
    return entrenamiento && entrenamiento.currentExerciseIndex >= (rutina?.ejercicios.length || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!rutina || !entrenamiento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {error || 'Error al cargar entrenamiento'}
          </h2>
          <button
            onClick={() => router.push('/rutinas')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Volver a rutinas
          </button>
        </div>
      </div>
    )
  }

  const currentSetInfo = getCurrentSet()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header con estadísticas */}
      <div className="bg-gray-800 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold">{rutina.name}</h1>
            <p className="text-gray-400 text-sm">
              {entrenamiento.currentExerciseIndex + 1} de {rutina.ejercicios.length} ejercicios
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {formatTime(entrenamiento.totalTime)}
              </div>
              <div className="text-xs text-gray-400">Tiempo total</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-400">
                {Object.values(entrenamiento.sets).flat().filter(s => s.completed).length}
              </div>
              <div className="text-xs text-gray-400">Sets completados</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {entrenamiento.isRestTime ? formatTime(entrenamiento.restTimeLeft) : '0:00'}
              </div>
              <div className="text-xs text-gray-400">Descanso</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {isWorkoutComplete() ? (
          // Entrenamiento completado
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">¡Entrenamiento Completado!</h2>
              <p className="text-gray-400">
                Has completado tu rutina en {formatTime(entrenamiento.totalTime)}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={finishWorkout}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-lg"
              >
                Finalizar Entrenamiento
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg"
              >
                Ver Estadísticas
              </button>
            </div>
          </div>
        ) : entrenamiento.isRestTime ? (
          // Tiempo de descanso
          <div className="text-center space-y-6">
            <div className="text-6xl">😴</div>
            <div>
              <h2 className="text-xl font-bold mb-2">Tiempo de Descanso</h2>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {formatTime(entrenamiento.restTimeLeft)}
              </div>
              <p className="text-gray-400">
                Próximo: {currentSetInfo?.exercise?.ejercicio?.nameEs || 'Ejercicio desconocido'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => addRestTime(30)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg"
                >
                  +30s
                </button>
                <button
                  onClick={() => addRestTime(60)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg"
                >
                  +1m
                </button>
              </div>
              
              <button
                onClick={skipRest}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-lg"
              >
                Saltar Descanso
              </button>
            </div>
          </div>
        ) : currentSetInfo ? (
          // Set activo
          <div className="space-y-6">
            {/* Ejercicio actual */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold mb-1">
                  {currentSetInfo.exercise?.ejercicio?.nameEs || 'Ejercicio desconocido'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {currentSetInfo.exercise?.ejercicio?.bodyPart || 'N/A'} • {currentSetInfo.exercise?.ejercicio?.equipment || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-lg font-bold text-blue-400">
                    {currentSetInfo.setIndex + 1}
                  </div>
                  <div className="text-xs text-gray-400">Set</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-green-400">
                    {currentSetInfo.exercise.reps}
                  </div>
                  <div className="text-xs text-gray-400">Reps objetivo</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-purple-400">
                    {currentSetInfo.exercise.weight || 0}kg
                  </div>
                  <div className="text-xs text-gray-400">Peso sugerido</div>
                </div>
              </div>
            </div>

            {/* Formulario del set */}
            <SetForm
              currentSet={currentSetInfo}
              onComplete={(setData) => completeSet(
                currentSetInfo.exerciseIndex,
                currentSetInfo.setIndex,
                setData
              )}
              onShowRPE={() => setShowRPEModal(true)}
            />
          </div>
        ) : null}

        {/* Progreso de ejercicios */}
        <div className="mt-8 space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Progreso de Ejercicios</h3>
          {rutina.ejercicios.map((ejercicio, index) => {
            const ejercicioSets = entrenamiento.sets[ejercicio.ejercicioId] || []
            const completedSets = ejercicioSets.filter(s => s.completed).length
            const isCurrent = index === entrenamiento.currentExerciseIndex
            const isCompleted = completedSets === ejercicio.sets

            return (
              <div
                key={ejercicio.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrent ? 'bg-blue-600/20 border border-blue-500' : 
                  isCompleted ? 'bg-green-600/20' : 'bg-gray-800'
                }`}
              >
                <div>
                  <div className="font-medium text-sm">
                    {ejercicio.ejercicio.nameEs}
                  </div>
                  <div className="text-xs text-gray-400">
                    {completedSets}/{ejercicio.sets} sets
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <CheckIcon className="h-5 w-5 text-green-400" />
                  )}
                  {isCurrent && (
                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal RPE */}
      {showRPEModal && (
        <RPEModal
          currentRPE={currentRPE}
          onRPEChange={setCurrentRPE}
          onClose={() => setShowRPEModal(false)}
        />
      )}
    </div>
  )
}

// Componente para el formulario del set
interface SetFormProps {
  currentSet: {
    exercise: RutinaEjercicio
    set: Set
    exerciseIndex: number
    setIndex: number
  }
  onComplete: (setData: Partial<Set>) => void
  onShowRPE: () => void
}

function SetForm({ currentSet, onComplete, onShowRPE }: SetFormProps) {
  const [reps, setReps] = useState<number>(parseInt(currentSet.exercise.reps) || 0)
  const [weight, setWeight] = useState<number>(currentSet.set.weight || currentSet.exercise.weight || 0)
  const [notes, setNotes] = useState<string>('')

  const handleComplete = () => {
    onComplete({
      reps,
      weight,
      notes,
      restTime: currentSet.exercise.restTime
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-bold text-center">Registrar Set</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Repeticiones
          </label>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(parseInt(e.target.value) || 0)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Peso (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.5"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Notas (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="¿Cómo se sintió? ¿Al fallo?"
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onShowRPE}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
          RPE
        </button>
        
        <button
          onClick={handleComplete}
          className="flex-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center"
        >
          <CheckIcon className="h-5 w-5 mr-2" />
          Completar Set
        </button>
      </div>
    </div>
  )
}

// Modal para seleccionar RPE
interface RPEModalProps {
  currentRPE: number
  onRPEChange: (rpe: number) => void
  onClose: () => void
}

function RPEModal({ currentRPE, onRPEChange, onClose }: RPEModalProps) {
  const rpeDescriptions = [
    { value: 1, label: 'Muy fácil', description: 'Podrías hacer muchas más reps' },
    { value: 2, label: 'Fácil', description: 'Podrías hacer 8-9 más reps' },
    { value: 3, label: 'Moderado', description: 'Podrías hacer 6-7 más reps' },
    { value: 4, label: 'Algo difícil', description: 'Podrías hacer 5-6 más reps' },
    { value: 5, label: 'Difícil', description: 'Podrías hacer 4 más reps' },
    { value: 6, label: 'Más difícil', description: 'Podrías hacer 3 más reps' },
    { value: 7, label: 'Muy difícil', description: 'Podrías hacer 2 más reps' },
    { value: 8, label: 'Extremadamente difícil', description: 'Podrías hacer 1 más rep' },
    { value: 9, label: 'Máximo esfuerzo', description: 'No podrías hacer ni 1 más rep' },
    { value: 10, label: 'Al fallo', description: 'Fallo muscular completo' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold mb-2">Rate of Perceived Exertion</h3>
          <p className="text-gray-400 text-sm">¿Qué tan difícil se sintió el set?</p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rpeDescriptions.map((rpe) => (
            <button
              key={rpe.value}
              onClick={() => onRPEChange(rpe.value)}
              className={`w-full text-left p-3 rounded-lg border ${
                currentRPE === rpe.value
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">RPE {rpe.value} - {rpe.label}</div>
                  <div className="text-xs text-gray-400">{rpe.description}</div>
                </div>
                {currentRPE === rpe.value && (
                  <CheckIcon className="h-5 w-5 text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg"
          >
            Confirmar RPE {currentRPE}
          </button>
        </div>
      </div>
    </div>
  )
}