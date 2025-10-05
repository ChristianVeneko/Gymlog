'use client'

import { useState } from 'react'

export default function TestPage() {
  const [token, setToken] = useState('')
  const [results, setResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setResults(prev => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)])
  }

  const clearResults = () => setResults([])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Centro de Pruebas - GymLog
          </h1>
          <p className="text-gray-600">
            Prueba todas las funcionalidades del sistema de fitness
          </p>
        </div>

        {/* Token Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔑 Token de Autenticación</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega tu token JWT aquí"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                const savedToken = localStorage.getItem('token')
                if (savedToken) {
                  setToken(savedToken)
                  addResult('Token cargado desde localStorage')
                } else {
                  addResult('No hay token en localStorage')
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Cargar desde Storage
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">📊 Resultados de Pruebas</h2>
            <button
              onClick={clearResults}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Limpiar
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md h-40 overflow-y-auto font-mono text-sm">
            {results.length === 0 ? (
              <div className="text-gray-500">Ejecuta pruebas para ver los resultados...</div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-1">{result}</div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Test de Base de Datos */}
          <TestSection 
            title="🗄️ Base de Datos" 
            icon="🗄️"
            tests={[
              {
                name: "Conexión BD",
                action: async () => {
                  const response = await fetch('/api/test-db')
                  const result = await response.json()
                  return result.success ? '✅ Conexión exitosa' : '❌ Error: ' + result.error
                }
              }
            ]}
            addResult={addResult}
          />

          {/* Test de Autenticación */}
          <TestSection 
            title="🔐 Autenticación" 
            icon="🔐"
            tests={[
              {
                name: "Perfil Usuario",
                action: async () => {
                  const response = await fetch('/api/auth/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  const result = await response.json()
                  return response.ok ? `✅ Usuario: ${result.user?.name}` : `❌ ${result.error}`
                }
              }
            ]}
            addResult={addResult}
          />

          {/* Test de Rutinas */}
          <TestSection 
            title="💪 Rutinas" 
            icon="💪"
            tests={[
              {
                name: "Listar Rutinas",
                action: async () => {
                  const response = await fetch('/api/rutinas?include_ejercicios=true', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  const result = await response.json()
                  return response.ok ? `✅ ${result.data?.length || 0} rutinas` : `❌ ${result.error}`
                }
              }
            ]}
            addResult={addResult}
          />

          {/* Test de Ejercicios */}
          <TestSection 
            title="🏋️ Ejercicios" 
            icon="🏋️"
            tests={[
              {
                name: "Ejercicios DB",
                action: async () => {
                  const response = await fetch('/api/ejercicios?source=db&limit=10', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  const result = await response.json()
                  return response.ok ? `✅ ${result.data?.ejercicios?.length || 0} ejercicios` : `❌ ${result.error}`
                }
              }
            ]}
            addResult={addResult}
          />

          {/* Test de Estadísticas */}
          <TestSection 
            title="📊 Estadísticas" 
            icon="📊"
            tests={[
              {
                name: "Overview Stats",
                action: async () => {
                  const response = await fetch('/api/stats?type=overview', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  const result = await response.json()
                  return response.ok ? `✅ ${result.data?.totalWorkouts || 0} entrenamientos` : `❌ ${result.error}`
                }
              }
            ]}
            addResult={addResult}
          />

          {/* Test de IA */}
          <TestSection 
            title="🤖 IA Gemini" 
            icon="🤖"
            tests={[
              {
                name: "Análisis Rutina",
                action: async () => {
                  const response = await fetch('/api/ia', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      type: 'analyze_routine',
                      data: { routine: 'Push Pull Legs' }
                    })
                  })
                  const result = await response.json()
                  return response.ok ? '✅ Análisis IA completado' : `❌ ${result.error}`
                }
              }
            ]}
            addResult={addResult}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🚀 Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.open('/login', '_blank')}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
            >
              🔑 Login
            </button>
            <button
              onClick={() => window.open('/dashboard', '_blank')}
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 text-center"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => window.open('/rutinas', '_blank')}
              className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-center"
            >
              💪 Rutinas
            </button>
            <button
              onClick={() => window.open('/rutinas/crear', '_blank')}
              className="px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-center"
            >
              ➕ Crear Rutina
            </button>
          </div>
        </div>

        {/* Información */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Para pruebas completas, primero autentícate y carga tu token</li>
            <li>• Algunas pruebas requieren datos existentes (rutinas, entrenamientos)</li>
            <li>• Los errores 404 pueden ser normales si no hay datos aún</li>
            <li>• Revisa la consola del navegador para más detalles</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

interface TestSectionProps {
  title: string
  icon: string
  tests: Array<{
    name: string
    action: () => Promise<string>
  }>
  addResult: (result: string) => void
}

function TestSection({ title, icon, tests, addResult }: TestSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const runTest = async (test: { name: string; action: () => Promise<string> }) => {
    setLoading(test.name)
    try {
      const result = await test.action()
      addResult(`${icon} ${test.name}: ${result}`)
    } catch (error) {
      addResult(`${icon} ${test.name}: ❌ Error: ${error}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="text-2xl mr-2">{icon}</span>
        {title}
      </h3>
      
      <div className="space-y-2">
        {tests.map((test, index) => (
          <button
            key={index}
            onClick={() => runTest(test)}
            disabled={loading === test.name}
            className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
              loading === test.name
                ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
            }`}
          >
            {loading === test.name ? '⏳ Ejecutando...' : test.name}
          </button>
        ))}
      </div>
    </div>
  )
}