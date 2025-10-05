import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { entrenamientos, sets, rutinas, ejercicios, rutinaEjercicios } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// GET: Obtener entrenamiento activo del día
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

      console.log(`🔍 Buscando entrenamiento activo para ${user.userId} en fecha ${fecha}`)

      // Buscar entrenamiento del día
      const entrenamientoActivo = await db
        .select({
          id: entrenamientos.id,
          userId: entrenamientos.userId,
          rutinaId: entrenamientos.rutinaId,
          fecha: entrenamientos.fecha,
          startTime: entrenamientos.startTime,
          endTime: entrenamientos.endTime,
          duration: entrenamientos.duration,
          notes: entrenamientos.notes,
          completed: entrenamientos.completed,
          createdAt: entrenamientos.createdAt,
          rutina: {
            id: rutinas.id,
            name: rutinas.name,
            description: rutinas.description
          }
        })
        .from(entrenamientos)
        .leftJoin(rutinas, eq(entrenamientos.rutinaId, rutinas.id))
        .where(
          and(
            eq(entrenamientos.userId, user.userId),
            eq(entrenamientos.fecha, fecha),
            eq(entrenamientos.completed, false) // Solo entrenamientos no completados
          )
        )
        .orderBy(desc(entrenamientos.createdAt))
        .limit(1)

      if (entrenamientoActivo.length === 0) {
        console.log('❌ No hay entrenamiento activo para hoy')
        return Response.json({
          success: true,
          data: null,
          message: 'No hay entrenamiento activo para hoy'
        })
      }

      const entrenamiento = entrenamientoActivo[0]
      console.log(`✅ Entrenamiento activo encontrado: ${entrenamiento.id}`)

      // Determinar día de la semana actual
      const fechaObj = new Date(fecha + 'T00:00:00')
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const diaActual = diasSemana[fechaObj.getDay()]
      
      console.log(`📅 Día actual: ${diaActual}`)

      // Obtener ejercicios de la rutina para el día actual
      const ejerciciosRutina = await db
        .select({
          id: rutinaEjercicios.ejercicioId,
          name: rutinaEjercicios.ejercicioName,
          nameEs: rutinaEjercicios.ejercicioNameEs,
          bodyPart: rutinaEjercicios.bodyPart,
          equipment: rutinaEjercicios.equipment,
          target: rutinaEjercicios.target,
          gifUrl: rutinaEjercicios.gifUrl,
          sets: rutinaEjercicios.sets,
          dayOfWeek: rutinaEjercicios.dayOfWeek,
          order: rutinaEjercicios.order
        })
        .from(rutinaEjercicios)
        .where(
          and(
            eq(rutinaEjercicios.rutinaId, entrenamiento.rutinaId),
            eq(rutinaEjercicios.dayOfWeek, diaActual)
          )
        )
        .orderBy(rutinaEjercicios.order)

      console.log(`📋 Ejercicios de la rutina: ${ejerciciosRutina.length}`)

      // Obtener sets completados
      const setsCompletados = await db
        .select()
        .from(sets)
        .where(eq(sets.entrenamientoId, entrenamiento.id))

      console.log(`✅ Sets completados: ${setsCompletados.length}`)

      // Formatear respuesta
      const response = {
        id: entrenamiento.id,
        rutinaId: entrenamiento.rutinaId,
        rutinaName: entrenamiento.rutina?.name || 'Sin nombre',
        rutinaDescription: entrenamiento.rutina?.description || '',
        fecha: entrenamiento.fecha,
        startTime: entrenamiento.startTime,
        exercises: ejerciciosRutina.map(ej => ({
          id: ej.id,
          name: ej.name || '',
          nameEs: ej.nameEs || '',
          bodyPart: ej.bodyPart || '',
          equipment: ej.equipment || '',
          gifUrl: ej.gifUrl || '',
          sets: ej.sets || 3
        })),
        sets: setsCompletados.map(set => ({
          setNumber: set.setNumber,
          ejercicioId: set.ejercicioId,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          fallo: set.notes?.includes('[FALLO]') || false,
          notes: set.notes?.replace('[FALLO]', '').trim() || '',
          rpe: set.rpe
        }))
      }

      return Response.json({
        success: true,
        data: response,
        message: 'Entrenamiento activo obtenido exitosamente'
      })

    } catch (error) {
      console.error('❌ Error obteniendo entrenamiento activo:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}
