import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { sets, entrenamientos, ejercicios, rutinaEjercicios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface SetData {
  setNumber: number
  ejercicioId: string
  weight?: number
  reps?: number
  completed: boolean
  fallo: boolean
  notes?: string
  rpe?: number
}

// PATCH: Actualizar sets del entrenamiento
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: entrenamientoId } = await params
      const body = await req.json()
      const setsData: SetData[] = body.sets || []

      console.log(`🔄 Actualizando ${setsData.length} sets para entrenamiento ${entrenamientoId}`)

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

      // Procesar cada set
      for (const setData of setsData) {
        // Verificar si el ejercicio existe en la tabla ejercicios
        const existingEjercicio = await db
          .select()
          .from(ejercicios)
          .where(eq(ejercicios.id, setData.ejercicioId))
          .limit(1)

        // Si no existe, buscar en rutina_ejercicios para obtener datos
        if (existingEjercicio.length === 0) {
          const rutinaEjercicio = await db
            .select()
            .from(rutinaEjercicios)
            .where(eq(rutinaEjercicios.ejercicioId, setData.ejercicioId))
            .limit(1)

          if (rutinaEjercicio.length > 0) {
            // Insertar ejercicio en tabla ejercicios
            await db
              .insert(ejercicios)
              .values({
                id: setData.ejercicioId,
                name: rutinaEjercicio[0].ejercicioName,
                nameEs: rutinaEjercicio[0].ejercicioNameEs,
                bodyPart: rutinaEjercicio[0].bodyPart,
                equipment: rutinaEjercicio[0].equipment,
                target: rutinaEjercicio[0].target,
                gifUrl: rutinaEjercicio[0].gifUrl
              })
              .onConflictDoNothing() // Si ya existe, no hacer nada
          }
        }

        // Buscar si el set ya existe
        const existingSet = await db
          .select()
          .from(sets)
          .where(
            and(
              eq(sets.entrenamientoId, entrenamientoId),
              eq(sets.ejercicioId, setData.ejercicioId),
              eq(sets.setNumber, setData.setNumber)
            )
          )
          .limit(1)

        const setRecord = {
          entrenamientoId,
          ejercicioId: setData.ejercicioId,
          setNumber: setData.setNumber,
          weight: setData.weight || null,
          reps: setData.reps || null,
          completed: setData.completed,
          rpe: setData.rpe || null,
          notes: setData.notes || null,
          // Agregamos el campo fallo directamente en notes con formato especial
          ...(setData.fallo && {
            notes: `[FALLO] ${setData.notes || ''}`.trim()
          })
        }

        if (existingSet.length > 0) {
          // Actualizar set existente
          await db
            .update(sets)
            .set(setRecord)
            .where(eq(sets.id, existingSet[0].id))
        } else {
          // Insertar nuevo set
          await db
            .insert(sets)
            .values({
              id: crypto.randomUUID(),
              ...setRecord
            })
        }
      }

      console.log(`✅ Sets actualizados exitosamente`)

      return Response.json({
        success: true,
        message: 'Sets actualizados exitosamente'
      })

    } catch (error) {
      console.error('❌ Error actualizando sets:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}
