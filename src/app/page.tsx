'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import Icon from '@/components/Icon'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [router, loading, isAuthenticated])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center text-white max-w-4xl mx-auto">
          <Icon name="logo" size={96} className="mb-8 mx-auto invert" />
          <h1 className="text-6xl font-bold mb-6">GymLog</h1>
          <p className="text-2xl mb-8 text-blue-100">
            Tu compañero inteligente para el fitness
          </p>
          <p className="text-lg mb-12 text-blue-100 max-w-2xl mx-auto">
            Crea rutinas personalizadas, registra tu progreso y obtén recomendaciones 
            de IA para alcanzar tus objetivos fitness de manera efectiva.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-4 px-8 rounded-xl transition-colors shadow-lg"
            >
              Crear Cuenta Gratis
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-4 px-8 rounded-xl transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Icon name="progress" size={48} className="mb-4 mx-auto invert" />
              <h3 className="text-xl font-semibold mb-2">Seguimiento Inteligente</h3>
              <p className="text-blue-100">
                Registra tu progreso automáticamente y visualiza tu evolución
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Icon name="ai-brain" size={48} className="mb-4 mx-auto invert" />
              <h3 className="text-xl font-semibold mb-2">IA Personal</h3>
              <p className="text-blue-100">
                Obtén recomendaciones personalizadas basadas en tu progreso
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Icon name="biceps" size={48} className="mb-4 mx-auto invert" />
              <h3 className="text-xl font-semibold mb-2">Rutinas Adaptables</h3>
              <p className="text-blue-100">
                Crea y modifica rutinas que se adapten a tu nivel y objetivos
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link href="/test" className="text-sm text-blue-200 hover:text-white inline-flex items-center gap-1">
              <Icon name="flask" size={16} className="invert" /> Página de pruebas técnicas
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
