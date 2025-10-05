'use client'

import { useState } from 'react'

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
  instructions: string[]
  gifUrl: string
}

export default function TestEjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const testAPI = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('accessToken')
      
      const url = searchTerm 
        ? `/api/ejercicios?search=${encodeURIComponent(searchTerm)}&limit=10`
        : '/api/ejercicios?limit=10'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setEjercicios(data.data || [])
        console.log('✅ API Response:', data)
      } else {
        setError(data.error || 'Error desconocido')
        console.error('❌ API Error:', data)
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('❌ Network Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Test API de Ejercicios
        </h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar ejercicios
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej: flexiones, pecho, push..."
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={testAPI}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {ejercicios.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              Haz clic en "Buscar" para cargar ejercicios
            </div>
          )}
          
          {ejercicios.map((ejercicio) => (
            <div key={ejercicio.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-4">
                {/* GIF */}
                <div className="flex-shrink-0">
                  <img
                    src={ejercicio.gifUrl}
                    alt={ejercicio.nameEs}
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-exercise.png'
                    }}
                  />
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {ejercicio.nameEs}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Original:</strong> {ejercicio.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Parte del cuerpo:</strong> {ejercicio.bodyPartEs} ({ejercicio.bodyPart})
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Equipamiento:</strong> {ejercicio.equipmentEs} ({ejercicio.equipment})
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Músculo objetivo:</strong> {ejercicio.targetEs} ({ejercicio.target})
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>ID:</strong> {ejercicio.id}
                  </p>
                </div>
              </div>
              
              {/* Instructions */}
              {ejercicio.instructions && ejercicio.instructions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Instrucciones:
                  </h4>
                  <ol className="text-sm text-gray-700 space-y-1">
                    {ejercicio.instructions.map((instruction, index) => (
                      <li key={index} className="list-decimal list-inside">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {ejercicios.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Resultados:</strong> {ejercicios.length} ejercicios encontrados
            </p>
            {searchTerm && (
              <p className="text-blue-700 text-sm mt-1">
                Búsqueda: "{searchTerm}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}