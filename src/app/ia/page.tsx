'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAuthGuard } from '@/lib/auth/AuthContext'
import Link from 'next/link'

export default function IAPage() {
  const { user } = useAuth()
  useAuthGuard()
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysisType, setAnalysisType] = useState('general')

  const requestAnalysis = async (type: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ia/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      const data = await res.json()
      if (data.success) {
        setAnalysis(data.data)
      } else {
        setError(data.error || 'Error al generar análisis')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 Análisis con IA</h1>
            <p className="text-gray-600">Obtén recomendaciones personalizadas sobre tu progreso</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Tipos de análisis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => {
              setAnalysisType('general')
              requestAnalysis('general')
            }}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl p-6 transition-colors text-left"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Análisis General</h3>
            <p className="text-blue-100 text-sm">Evaluación completa de tu progreso y rendimiento</p>
          </button>

          <button
            onClick={() => {
              setAnalysisType('rutina')
              requestAnalysis('rutina')
            }}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl p-6 transition-colors text-left"
          >
            <div className="text-3xl mb-3">💪</div>
            <h3 className="font-semibold text-lg mb-2">Optimización de Rutina</h3>
            <p className="text-green-100 text-sm">Recomendaciones para mejorar tu rutina actual</p>
          </button>

          <button
            onClick={() => {
              setAnalysisType('recovery')
              requestAnalysis('recovery')
            }}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl p-6 transition-colors text-left"
          >
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="font-semibold text-lg mb-2">Recuperación</h3>
            <p className="text-purple-100 text-sm">Consejos sobre descanso y recuperación</p>
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generando análisis con IA...</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <div className="text-3xl mr-3">🤖</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Análisis Personalizado</h2>
                <p className="text-gray-600 text-sm">Generado el {new Date().toLocaleDateString('es-ES')}</p>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {analysis.analysis || analysis.message || 'No se pudo generar el análisis'}
              </div>
            </div>

            {analysis.recommendations && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Recomendaciones</h3>
                <div className="text-blue-800 text-sm">
                  {analysis.recommendations}
                </div>
              </div>
            )}
          </div>
        )}

        {!analysis && !loading && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="text-6xl mb-6">🧠</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Análisis Inteligente</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Selecciona un tipo de análisis arriba para obtener recomendaciones personalizadas basadas en tu progreso y objetivos
            </p>
            <div className="text-sm text-gray-500">
              Powered by Google Gemini AI ✨
            </div>
          </div>
        )}
      </div>
    </div>
  )
}