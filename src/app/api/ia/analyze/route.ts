import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { type } = body

      // Simulación de análisis IA (aquí iría la integración real con Gemini)
      const analyses = {
        general: {
          analysis: `Análisis General de Progreso para ${user.name}:

🎯 RESUMEN GENERAL:
Tu progreso muestra una tendencia positiva en los últimos entrenamientos. Has mantenido una consistencia admirable en tus sesiones de entrenamiento.

💪 FORTALEZAS IDENTIFICADAS:
• Constancia en los entrenamientos
• Progresión gradual en los pesos
• Buena variedad de ejercicios

📈 ÁREAS DE MEJORA:
• Considera aumentar la intensidad en ejercicios de empuje
• Trabaja más en ejercicios unilaterales para equilibrio muscular
• Incrementa el tiempo de descanso entre series pesadas

🔥 RECOMENDACIONES:
1. Aumenta el peso en press de banca en un 5-10%
2. Incluye más ejercicios de core en tu rutina
3. Considera hacer deload cada 4-6 semanas
4. Mejora tu hidratación durante los entrenamientos

Tu dedicación es excelente. ¡Sigue así!`,
          recommendations: 'Mantén la consistencia y enfócate en la progresión gradual. Tu cuerpo responde bien al estímulo actual.'
        },
        rutina: {
          analysis: `Optimización de Rutina para ${user.name}:

🏋️‍♂️ ANÁLISIS DE RUTINA ACTUAL:
Tu rutina actual muestra un buen balance entre ejercicios compuestos y de aislamiento.

🎯 SUGERENCIAS DE OPTIMIZACIÓN:
• Reorganizar el orden de ejercicios para maximizar el rendimiento
• Ajustar los rangos de repeticiones según tus objetivos
• Incluir más trabajo de movilidad y calentamiento

📊 DISTRIBUCIÓN RECOMENDADA:
- 60% ejercicios compuestos (sentadillas, press, dominadas)
- 30% ejercicios de aislamiento (curl, extensiones)
- 10% trabajo correctivo y movilidad

⚡ MODIFICACIONES PROPUESTAS:
1. Comenzar con ejercicios más demandantes neuralmente
2. Agrupar músculos sinérgicos en la misma sesión
3. Alternar intensidades altas y moderadas

Tu rutina tiene potencial de mejora significativo con estos ajustes.`,
          recommendations: 'Implementa los cambios gradualmente. Prueba la nueva estructura durante 2-3 semanas antes de evaluar resultados.'
        },
        recovery: {
          analysis: `Análisis de Recuperación para ${user.name}:

😴 ESTADO DE RECUPERACIÓN:
Basado en la frecuencia de tus entrenamientos, tu recuperación parece adecuada pero puede optimizarse.

🔄 FACTORES CLAVE:
• Descanso entre entrenamientos: Adecuado
• Intensidad vs Volumen: Bien balanceado
• Signos de sobreentrenamiento: No detectados

💤 RECOMENDACIONES DE RECUPERACIÓN:
1. Asegura 7-9 horas de sueño de calidad
2. Incluye 1-2 días de descanso activo por semana
3. Considera sesiones de movilidad los días de descanso
4. Hidratación: mínimo 35ml por kg de peso corporal

🍎 NUTRICIÓN PARA RECUPERACIÓN:
- Proteína: 1.6-2.2g por kg de peso corporal
- Carbohidratos post-entrenamiento dentro de 30 min
- Omega-3 para reducir inflamación

Tu cuerpo está respondiendo bien. Estos ajustes optimizarán tu recuperación.`,
          recommendations: 'Prioriza el sueño y la nutrición. Son tan importantes como el entrenamiento mismo para tu progreso.'
        }
      }

      const selectedAnalysis = analyses[type as keyof typeof analyses] || analyses.general

      return Response.json(
        {
          success: true,
          data: selectedAnalysis
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error en análisis IA:', error)
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