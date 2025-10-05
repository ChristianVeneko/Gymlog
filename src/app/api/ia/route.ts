import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface AnalysisRequest {
  type: 'routine_review' | 'progress_analysis' | 'workout_suggestions' | 'form_feedback'
  data: any
}

// POST: Obtener análisis y recomendaciones de IA
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body: AnalysisRequest = await req.json()
      const { type, data } = body

      if (!type || !data) {
        return Response.json(
          {
            success: false,
            error: 'Tipo de análisis y datos son requeridos'
          },
          { status: 400 }
        )
      }

      let prompt = ''
      let context = ''

      switch (type) {
        case 'routine_review':
          context = `Eres un entrenador personal experto. Analiza la siguiente rutina de entrenamiento y proporciona recomendaciones detalladas.`
          prompt = `
Rutina: ${data.name}
Descripción: ${data.description}
Días de entrenamiento: ${data.daysOfWeek}
Ejercicios: ${JSON.stringify(data.ejercicios, null, 2)}

Por favor analiza esta rutina y proporciona:
1. Evaluación general de la rutina
2. Balance muscular (¿está bien balanceada?)
3. Volumen de entrenamiento (¿es apropiado?)
4. Progresión sugerida
5. Modificaciones recomendadas
6. Precauciones o consejos de seguridad

Responde de manera profesional y constructiva.`
          break

        case 'progress_analysis':
          context = `Eres un entrenador personal experto en análisis de progreso. Analiza los datos de entrenamiento del usuario.`
          prompt = `
Datos de progreso del usuario:
Entrenamientos completados: ${data.totalWorkouts}
Período: ${data.period}
Ejercicios principales: ${JSON.stringify(data.exercises)}
Progreso de peso/repeticiones: ${JSON.stringify(data.progressData)}

Proporciona un análisis detallado que incluya:
1. Evaluación del progreso general
2. Áreas de fortaleza
3. Áreas que necesitan mejora
4. Recomendaciones específicas para continuar progresando
5. Sugerencias de ajustes en la rutina
6. Metas realistas para las próximas semanas

Sé específico y actionable en tus recomendaciones.`
          break

        case 'workout_suggestions':
          context = `Eres un entrenador personal experto. Sugiere entrenamientos basados en las preferencias y objetivos del usuario.`
          prompt = `
Información del usuario:
Objetivos: ${data.goals}
Nivel de experiencia: ${data.experience}
Tiempo disponible: ${data.timeAvailable}
Equipamiento: ${data.equipment}
Preferencias: ${data.preferences}
Restricciones/lesiones: ${data.restrictions || 'Ninguna'}

Crea 3 sugerencias de rutina diferentes que incluyan:
1. Nombre de la rutina
2. Duración estimada
3. Lista de ejercicios con series y repeticiones
4. Enfoque principal de la rutina
5. Días de la semana recomendados

Adapta las sugerencias al nivel y objetivos del usuario.`
          break

        case 'form_feedback':
          context = `Eres un entrenador personal experto en técnica de ejercicios. Proporciona feedback sobre la forma y técnica.`
          prompt = `
Ejercicio: ${data.exercise}
Descripción del problema: ${data.description}
Video/imagen disponible: ${data.hasMedia ? 'Sí' : 'No'}

Proporciona consejos detallados sobre:
1. Técnica correcta para este ejercicio
2. Errores comunes y cómo evitarlos
3. Progresiones y regresiones
4. Músculos objetivo y sinergistas
5. Consejos de seguridad
6. Variaciones recomendadas

Sé específico y educativo en tu respuesta.`
          break

        default:
          return Response.json(
            {
              success: false,
              error: 'Tipo de análisis no válido'
            },
            { status: 400 }
          )
      }

      // Generar respuesta con Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      const fullPrompt = `${context}\n\n${prompt}\n\nResponde en español, de manera profesional y estructurada.`
      
      const result = await model.generateContent(fullPrompt)
      const response = await result.response
      const aiResponse = response.text()

      if (!aiResponse) {
        return Response.json(
          {
            success: false,
            error: 'No se pudo generar una respuesta'
          },
          { status: 500 }
        )
      }

      return Response.json(
        {
          success: true,
          data: {
            type,
            analysis: aiResponse,
            timestamp: new Date().toISOString(),
            userId: user.userId
          }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error en análisis de IA:', error)
      
      // Manejar errores específicos de la API de Gemini
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return Response.json(
            {
              success: false,
              error: 'Error de configuración de IA. Contacta al administrador.'
            },
            { status: 500 }
          )
        }
        
        if (error.message.includes('quota') || error.message.includes('limit')) {
          return Response.json(
            {
              success: false,
              error: 'Límite de consultas de IA alcanzado. Intenta más tarde.'
            },
            { status: 429 }
          )
        }
      }

      return Response.json(
        {
          success: false,
          error: 'Error interno del servidor de IA'
        },
        { status: 500 }
      )
    }
  })
}

// GET: Obtener tipos de análisis disponibles
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const analysisTypes = [
        {
          type: 'routine_review',
          name: 'Revisión de Rutina',
          description: 'Análisis completo de tu rutina de entrenamiento con recomendaciones de mejora',
          requiredData: ['rutina con ejercicios', 'objetivos', 'experiencia']
        },
        {
          type: 'progress_analysis',
          name: 'Análisis de Progreso',
          description: 'Evaluación de tu progreso y recomendaciones para continuar mejorando',
          requiredData: ['historial de entrenamientos', 'mediciones', 'período de tiempo']
        },
        {
          type: 'workout_suggestions',
          name: 'Sugerencias de Entrenamiento',
          description: 'Rutinas personalizadas basadas en tus objetivos y disponibilidad',
          requiredData: ['objetivos', 'tiempo disponible', 'equipamiento', 'experiencia']
        },
        {
          type: 'form_feedback',
          name: 'Feedback de Técnica',
          description: 'Consejos sobre técnica correcta y mejoras en la ejecución de ejercicios',
          requiredData: ['ejercicio específico', 'descripción del problema o duda']
        }
      ]

      return Response.json(
        {
          success: true,
          data: {
            analysisTypes,
            availableModels: ['gemini-pro'],
            usage: {
              quotaUsed: 0, // Aquí podrías implementar un contador real
              quotaLimit: 1000
            }
          }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error obteniendo tipos de análisis:', error)
      return Response.json(
        {
          success: false,
          error: 'Error interno del servidor'
        },
        { status: 500 }
      )
    }
  })
}