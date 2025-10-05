import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { rutinas, rutinaEjercicios, entrenamientos, sets } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface RutinaEjercicio {
  ejercicioId: string
  ejercicioName: string
  ejercicioNameEs?: string
  bodyPart?: string
  equipment?: string
  target?: string
  gifUrl?: string
  dayOfWeek: string
  sets?: number
  reps?: string
  weight?: number
  restTime?: number
  notes?: string
  order: number
}

// DELETE: Eliminar rutina específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de rutina requerido' 
        }, { status: 400 })
      }

      // Verificar que la rutina pertenece al usuario
      const existingRutina = await db
        .select()
        .from(rutinas)
        .where(and(eq(rutinas.id, id), eq(rutinas.userId, user.userId)))
        .limit(1)

      if (existingRutina.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Rutina no encontrada' 
        }, { status: 404 })
      }

      // Eliminar en orden correcto para evitar violaciones de Foreign Key
      
      // 1. Obtener todos los entrenamientos de esta rutina
      const entrenamientosToDelete = await db
        .select({ id: entrenamientos.id })
        .from(entrenamientos)
        .where(eq(entrenamientos.rutinaId, id))

      // 2. Eliminar sets de los entrenamientos
      for (const entrenamiento of entrenamientosToDelete) {
        await db
          .delete(sets)
          .where(eq(sets.entrenamientoId, entrenamiento.id))
      }

      // 3. Eliminar entrenamientos de la rutina
      await db
        .delete(entrenamientos)
        .where(eq(entrenamientos.rutinaId, id))

      // 4. Eliminar ejercicios de la rutina
      await db
        .delete(rutinaEjercicios)
        .where(eq(rutinaEjercicios.rutinaId, id))

      // 5. Eliminar rutina
      await db
        .delete(rutinas)
        .where(eq(rutinas.id, id))

      return Response.json({ 
        success: true, 
        message: 'Rutina eliminada exitosamente' 
      })

    } catch (error) {
      console.error('Error deleting rutina:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al eliminar rutina' 
      }, { status: 500 })
    }
  })
}

// PUT: Actualizar rutina específica
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params
      const body = await req.json()

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de rutina requerido' 
        }, { status: 400 })
      }

      // Verificar que la rutina pertenece al usuario
      const existingRutina = await db
        .select()
        .from(rutinas)
        .where(and(eq(rutinas.id, id), eq(rutinas.userId, user.userId)))
        .limit(1)

      if (existingRutina.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Rutina no encontrada' 
        }, { status: 404 })
      }

      // Actualizar rutina
      const updateData = {
        name: body.name,
        description: body.description || '',
        daysOfWeek: body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : null,
        isActive: body.isActive ?? true,
        updatedAt: new Date().toISOString()
      }

      const [updatedRutina] = await db
        .update(rutinas)
        .set(updateData)
        .where(eq(rutinas.id, id))
        .returning()

      // Si hay ejercicios, actualizar también
      if (body.ejercicios && Array.isArray(body.ejercicios)) {
        // Eliminar ejercicios existentes
        await db
          .delete(rutinaEjercicios)
          .where(eq(rutinaEjercicios.rutinaId, id))

        // Insertar nuevos ejercicios
        if (body.ejercicios.length > 0) {
          const ejerciciosData = body.ejercicios.map((ejercicio: RutinaEjercicio, index: number) => ({
            rutinaId: id,
            ejercicioId: ejercicio.ejercicioId,
            ejercicioName: ejercicio.ejercicioName,
            ejercicioNameEs: ejercicio.ejercicioNameEs || ejercicio.ejercicioName,
            bodyPart: ejercicio.bodyPart || '',
            equipment: ejercicio.equipment || '',
            target: ejercicio.target || '',
            gifUrl: ejercicio.gifUrl || '',
            dayOfWeek: ejercicio.dayOfWeek,
            sets: ejercicio.sets || null,
            reps: ejercicio.reps || null,
            weight: ejercicio.weight || null,
            restTime: ejercicio.restTime || null,
            notes: ejercicio.notes || '',
            order: ejercicio.order ?? index + 1
          }))

          await db
            .insert(rutinaEjercicios)
            .values(ejerciciosData)
        }
      }

      return Response.json({ 
        success: true, 
        data: updatedRutina,
        message: 'Rutina actualizada exitosamente' 
      })

    } catch (error) {
      console.error('Error updating rutina:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al actualizar rutina' 
      }, { status: 500 })
    }
  })
}

// GET: Obtener rutina específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de rutina requerido' 
        }, { status: 400 })
      }

      // Obtener rutina
      const rutina = await db
        .select()
        .from(rutinas)
        .where(and(eq(rutinas.id, id), eq(rutinas.userId, user.userId)))
        .limit(1)

      if (rutina.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Rutina no encontrada' 
        }, { status: 404 })
      }

      // Obtener ejercicios de la rutina
      const ejercicios = await db
        .select()
        .from(rutinaEjercicios)
        .where(eq(rutinaEjercicios.rutinaId, id))
        .orderBy(rutinaEjercicios.dayOfWeek, rutinaEjercicios.order)

      const rutinaWithEjercicios = {
        ...rutina[0],
        daysOfWeek: rutina[0].daysOfWeek ? JSON.parse(rutina[0].daysOfWeek) : [],
        ejercicios: ejercicios
      }

      return Response.json({ 
        success: true, 
        data: rutinaWithEjercicios 
      })

    } catch (error) {
      console.error('Error fetching rutina:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al obtener rutina' 
      }, { status: 500 })
    }
  })
}