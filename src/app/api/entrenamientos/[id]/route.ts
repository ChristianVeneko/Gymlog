import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { entrenamientos, sets, ejercicios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET: Obtener detalle completo de un entrenamiento con sus sets
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: entrenamientoId } = await params

      // Obtener entrenamiento
      const entrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(
          and(
            eq(entrenamientos.id, entrenamientoId),
            eq(entrenamientos.userId, user.userId)
          )
        )
        .limit(1)

      if (entrenamiento.length === 0) {
        return Response.json({
          success: false,
          error: 'Entrenamiento no encontrado'
        }, { status: 404 })
      }

      // Obtener todos los sets del entrenamiento
      const allSets = await db
        .select({
          id: sets.id,
          ejercicioId: sets.ejercicioId,
          ejercicioName: ejercicios.name,
          ejercicioNameEs: ejercicios.nameEs,
          bodyPart: ejercicios.bodyPart,
          gifUrl: ejercicios.gifUrl,
          setNumber: sets.setNumber,
          weight: sets.weight,
          reps: sets.reps,
          notes: sets.notes,
          rpe: sets.rpe,
          completed: sets.completed
        })
        .from(sets)
        .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
        .where(eq(sets.entrenamientoId, entrenamientoId))
        .orderBy(sets.ejercicioId, sets.setNumber)

      // Agrupar sets por ejercicio
      const ejerciciosMap = new Map<string, any>()
      allSets.forEach(set => {
        if (!ejerciciosMap.has(set.ejercicioId!)) {
          ejerciciosMap.set(set.ejercicioId!, {
            ejercicioId: set.ejercicioId,
            ejercicioName: set.ejercicioName,
            ejercicioNameEs: set.ejercicioNameEs,
            bodyPart: set.bodyPart,
            gifUrl: set.gifUrl,
            sets: []
          })
        }
        
        // Parsear el campo fallo desde notes
        const isFailed = set.notes?.startsWith('[FALLO]') || false
        const cleanNotes = isFailed 
          ? set.notes?.replace('[FALLO]', '').trim() 
          : set.notes
        
        ejerciciosMap.get(set.ejercicioId!)!.sets.push({
          id: set.id,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          failed: isFailed,
          notes: cleanNotes,
          rpe: set.rpe,
          completed: set.completed
        })
      })

      return Response.json({
        success: true,
        data: {
          ...entrenamiento[0],
          ejercicios: Array.from(ejerciciosMap.values())
        }
      })

    } catch (error) {
      console.error('❌ Error obteniendo detalle de entrenamiento:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}

// PATCH: Actualizar entrenamiento (finalizar, agregar notas, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: entrenamientoId } = await params
      const body = await req.json()

      console.log(`🔄 Actualizando entrenamiento ${entrenamientoId}`)

      // Verificar que el entrenamiento pertenece al usuario
      const entrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(
          and(
            eq(entrenamientos.id, entrenamientoId),
            eq(entrenamientos.userId, user.userId)
          )
        )
        .limit(1)

      if (entrenamiento.length === 0) {
        return Response.json({
          success: false,
          error: 'Entrenamiento no encontrado'
        }, { status: 404 })
      }

      // Preparar datos de actualización
      const updateData: any = {}
      
      if (body.completed !== undefined) {
        updateData.completed = body.completed
        
        // Si se está completando, registrar tiempo de fin
        if (body.completed) {
          const now = new Date()
          updateData.endTime = now.toTimeString().slice(0, 5) // HH:MM
          
          // Solo calcular duración automáticamente si no se proporciona una duración manual
          if (!body.duration && entrenamiento[0].startTime) {
            const [startHour, startMin] = entrenamiento[0].startTime.split(':').map(Number)
            const startDate = new Date()
            startDate.setHours(startHour, startMin, 0)
            
            const durationMs = now.getTime() - startDate.getTime()
            const durationMinutes = Math.round(durationMs / (1000 * 60))
            updateData.duration = Math.max(1, durationMinutes) // Mínimo 1 minuto
          }
        }
      }

      if (body.endTime) updateData.endTime = body.endTime
      if (body.duration) updateData.duration = body.duration
      if (body.notes !== undefined) updateData.notes = body.notes

      // Actualizar entrenamiento
      const [updatedEntrenamiento] = await db
        .update(entrenamientos)
        .set(updateData)
        .where(eq(entrenamientos.id, entrenamientoId))
        .returning()

      console.log(`✅ Entrenamiento actualizado exitosamente`)

      return Response.json({
        success: true,
        data: updatedEntrenamiento,
        message: 'Entrenamiento actualizado exitosamente'
      })

    } catch (error) {
      console.error('❌ Error actualizando entrenamiento:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}

// DELETE: Eliminar entrenamiento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: entrenamientoId } = await params

      // Verificar que el entrenamiento pertenece al usuario
      const entrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(
          and(
            eq(entrenamientos.id, entrenamientoId),
            eq(entrenamientos.userId, user.userId)
          )
        )
        .limit(1)

      if (entrenamiento.length === 0) {
        return Response.json({
          success: false,
          error: 'Entrenamiento no encontrado'
        }, { status: 404 })
      }

      // Eliminar entrenamiento (los sets se eliminan automáticamente por cascade)
      await db
        .delete(entrenamientos)
        .where(eq(entrenamientos.id, entrenamientoId))

      return Response.json({
        success: true,
        message: 'Entrenamiento eliminado exitosamente'
      })

    } catch (error) {
      console.error('❌ Error eliminando entrenamiento:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}
