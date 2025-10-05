import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { entrenamientos, sets, rutinas, ejercicios } from '@/lib/db/schema'
import { eq, and, desc, gte, lte, count } from 'drizzle-orm'

// GET: Obtener entrenamientos del usuario
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const rutinaId = searchParams.get('rutinaId')
      const completed = searchParams.get('completed')
      const limit = parseInt(searchParams.get('limit') || '50')

      // Construir condiciones WHERE
      const whereConditions = [eq(entrenamientos.userId, user.userId)]
      
      if (startDate) whereConditions.push(gte(entrenamientos.fecha, startDate))
      if (endDate) whereConditions.push(lte(entrenamientos.fecha, endDate))
      if (rutinaId) whereConditions.push(eq(entrenamientos.rutinaId, rutinaId))
      if (completed === 'true') whereConditions.push(eq(entrenamientos.completed, true))
      if (completed === 'false') whereConditions.push(eq(entrenamientos.completed, false))

      const userEntrenamientos = await db
        .select({
          id: entrenamientos.id,
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
        .where(and(...whereConditions))
        .orderBy(desc(entrenamientos.fecha), desc(entrenamientos.createdAt))
        .limit(limit)

      // Obtener sets para cada entrenamiento
      const entrenamientosWithSets = await Promise.all(
        userEntrenamientos.map(async (entrenamiento) => {
          const entrenamientoSets = await db
            .select({
              id: sets.id,
              ejercicioId: sets.ejercicioId,
              setNumber: sets.setNumber,
              reps: sets.reps,
              weight: sets.weight,
              duration: sets.duration,
              completed: sets.completed,
              restTime: sets.restTime,
              rpe: sets.rpe,
              ejercicio: {
                id: ejercicios.id,
                name: ejercicios.name,
                nameEs: ejercicios.nameEs
              }
            })
            .from(sets)
            .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
            .where(eq(sets.entrenamientoId, entrenamiento.id))
            .orderBy(sets.setNumber)

          return {
            ...entrenamiento,
            sets: entrenamientoSets
          }
        })
      )

      return Response.json(
        {
          success: true,
          data: {
            entrenamientos: entrenamientosWithSets,
            total: entrenamientosWithSets.length
          }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error obteniendo entrenamientos:', error)
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

// POST: Crear nuevo entrenamiento
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { rutinaId, fecha, startTime, notes } = body

      // Validaciones básicas
      if (!rutinaId || !fecha) {
        return Response.json(
          {
            success: false,
            error: 'ID de rutina y fecha son requeridos'
          },
          { status: 400 }
        )
      }

      // Verificar que la rutina pertenece al usuario
      const rutina = await db
        .select()
        .from(rutinas)
        .where(and(eq(rutinas.id, rutinaId), eq(rutinas.userId, user.userId)))
        .limit(1)

      if (rutina.length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Rutina no encontrada'
          },
          { status: 404 }
        )
      }

      // Crear el entrenamiento
      const newEntrenamiento = await db
        .insert(entrenamientos)
        .values({
          userId: user.userId,
          rutinaId,
          fecha,
          startTime: startTime || new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          notes: notes || '',
          completed: false
        })
        .returning()

      return Response.json(
        {
          success: true,
          message: 'Entrenamiento creado exitosamente',
          data: { entrenamiento: newEntrenamiento[0] }
        },
        { status: 201 }
      )

    } catch (error) {
      console.error('Error creando entrenamiento:', error)
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

// PUT: Actualizar entrenamiento
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { id, endTime, duration, notes, completed, sets: setsData } = body

      if (!id) {
        return Response.json(
          {
            success: false,
            error: 'ID de entrenamiento requerido'
          },
          { status: 400 }
        )
      }

      // Verificar que el entrenamiento pertenece al usuario
      const existingEntrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, id), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (existingEntrenamiento.length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Entrenamiento no encontrado'
          },
          { status: 404 }
        )
      }

      // Actualizar entrenamiento
      const updateData: any = {}
      if (endTime !== undefined) updateData.endTime = endTime
      if (duration !== undefined) updateData.duration = duration
      if (notes !== undefined) updateData.notes = notes
      if (completed !== undefined) updateData.completed = completed

      const updatedEntrenamiento = await db
        .update(entrenamientos)
        .set(updateData)
        .where(eq(entrenamientos.id, id))
        .returning()

      // Actualizar sets si se proporcionaron
      if (setsData && Array.isArray(setsData)) {
        // Eliminar sets existentes
        await db.delete(sets).where(eq(sets.entrenamientoId, id))

        // Insertar nuevos sets
        if (setsData.length > 0) {
          const setsToInsert = setsData.map((set: any) => ({
            entrenamientoId: id,
            ejercicioId: set.ejercicioId,
            setNumber: set.setNumber || 1,
            reps: set.reps || null,
            weight: set.weight || null,
            duration: set.duration || null,
            completed: set.completed || false,
            restTime: set.restTime || null,
            rpe: set.rpe || null
          }))

          await db.insert(sets).values(setsToInsert)
        }
      }

      return Response.json(
        {
          success: true,
          message: 'Entrenamiento actualizado exitosamente',
          data: { entrenamiento: updatedEntrenamiento[0] }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error actualizando entrenamiento:', error)
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

// DELETE: Eliminar entrenamiento
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')

      if (!id) {
        return Response.json(
          {
            success: false,
            error: 'ID de entrenamiento requerido'
          },
          { status: 400 }
        )
      }

      // Verificar que el entrenamiento pertenece al usuario
      const existingEntrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, id), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (existingEntrenamiento.length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Entrenamiento no encontrado'
          },
          { status: 404 }
        )
      }

      // Eliminar sets del entrenamiento primero
      await db.delete(sets).where(eq(sets.entrenamientoId, id))

      // Eliminar el entrenamiento
      await db.delete(entrenamientos).where(eq(entrenamientos.id, id))

      return Response.json(
        {
          success: true,
          message: 'Entrenamiento eliminado exitosamente'
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error eliminando entrenamiento:', error)
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