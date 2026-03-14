'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { formatDateString } from '@/lib/utils/dateUtils'

interface WorkoutSet {
  id: string
  setNumber: number
  weight: number | null
  reps: number | null
  failed: boolean
  notes: string | null
  rpe: number | null
  completed: boolean | null
}

interface WorkoutExercise {
  ejercicioId: string
  ejercicioName: string

  bodyPart: string
  gifUrl: string
  sets: WorkoutSet[]
}

interface WorkoutDetail {
  id: string
  rutinaId: string
  userId: string
  fecha: string
  startTime: string | null
  endTime: string | null
  duration: number | null
  completed: boolean | null
  notes: string | null
  workoutTitle: string | null
  ejercicios: WorkoutExercise[]
}

interface WorkoutDetailModalProps {
  workoutId: string
  onClose: () => void
}



export default function WorkoutDetailModal({ workoutId, onClose }: WorkoutDetailModalProps) {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkoutDetail = async () => {
      try {
        const response = await fetch(`/api/entrenamientos/${workoutId}`, {
          credentials: 'include'
        })

        const data = await response.json()
        if (data.success) {
          setWorkout(data.data)
        } else {
          setError(data.error || 'Error al cargar el entrenamiento')
        }
      } catch (err) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkoutDetail()
  }, [workoutId])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Cargando detalles...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Entrenamiento no encontrado'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {workout.workoutTitle || 'Detalles del Entrenamiento'}
              </h2>
              <div className="space-y-1 text-sm text-blue-100">
                <p>{(() => {
                  const [year, month, day] = workout.fecha.split('-').map(Number)
                  const date = new Date(year, month - 1, day)
                  return date.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                })()}</p>
                <p>Duración: {workout.duration} minutos</p>
                {workout.startTime && workout.endTime && (
                  <p>{workout.startTime} - {workout.endTime}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {workout.notes && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Notas del Entrenamiento</h3>
              <p className="text-yellow-800 text-sm">{workout.notes}</p>
            </div>
          )}

          <div className="space-y-6">
            {workout.ejercicios.map((ejercicio, idx) => (
              <div key={ejercicio.ejercicioId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Ejercicio Header */}
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <div className="flex items-start gap-4">
                    {ejercicio.gifUrl && (
                      <img 
                        src={ejercicio.gifUrl} 
                        alt={ejercicio.ejercicioName}
                        className="w-20 h-20 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">
                        {idx + 1}. {ejercicio.ejercicioName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {ejercicio.bodyPart}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {ejercicio.sets.length} {ejercicio.sets.length === 1 ? 'serie' : 'series'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Serie</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Peso (kg)</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Reps</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Fallo</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">RPE</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ejercicio.sets.map((set) => (
                        <tr 
                          key={set.id} 
                          className={`${set.completed ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {set.completed && (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              )}
                              {set.setNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {set.weight ? `${set.weight} kg` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {set.reps || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {set.failed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Fallo
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {set.rpe || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {set.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {workout.ejercicios.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No hay ejercicios registrados en este entrenamiento</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
