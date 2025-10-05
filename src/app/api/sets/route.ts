import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { sets, entrenamientos, ejercicios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

interface SetRequest {
  entrenamientoId: string
  ejercicioId: string
  setNumber: number
  reps?: number
  weight?: number
  duration?: number
  completed: boolean
  restTime?: number
  rpe?: number // Rate of Perceived Exertion (1-10)
  notes?: string
}

// GET: Obtener sets de un entrenamiento
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const entrenamientoId = searchParams.get('entrenamientoId')
      const ejercicioId = searchParams.get('ejercicioId')

      if (!entrenamientoId) {
        return Response.json({ 
          success: false, 
          error: 'ID de entrenamiento requerido' 
        }, { status: 400 })
      }

      // Verificar que el entrenamiento pertenece al usuario
      const entrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, entrenamientoId), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (entrenamiento.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Entrenamiento no encontrado' 
        }, { status: 404 })
      }

      // Construir condiciones where
      let whereConditions = eq(sets.entrenamientoId, entrenamientoId)
      
      if (ejercicioId) {
        whereConditions = and(whereConditions, eq(sets.ejercicioId, ejercicioId)) as any
      }

      const entrenamientoSets = await db
        .select({
          id: sets.id,
          entrenamientoId: sets.entrenamientoId,
          ejercicioId: sets.ejercicioId,
          setNumber: sets.setNumber,
          reps: sets.reps,
          weight: sets.weight,
          duration: sets.duration,
          completed: sets.completed,
          restTime: sets.restTime,
          rpe: sets.rpe,
          notes: sets.notes,
          createdAt: sets.createdAt,
          ejercicio: {
            id: ejercicios.id,
            name: ejercicios.name,
            nameEs: ejercicios.nameEs,
            bodyPart: ejercicios.bodyPart,
            equipment: ejercicios.equipment,
            target: ejercicios.target,
            gifUrl: ejercicios.gifUrl
          }
        })
        .from(sets)
        .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
        .where(whereConditions)
        .orderBy(sets.setNumber)

      return Response.json({ 
        success: true, 
        data: entrenamientoSets 
      })

    } catch (error) {
      console.error('Error fetching sets:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al obtener sets' 
      }, { status: 500 })
    }
  })
}

// POST: Crear nuevo set
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body: SetRequest = await req.json()

      // Validar datos requeridos
      if (!body.entrenamientoId || !body.ejercicioId || body.setNumber === undefined) {
        return Response.json({ 
          success: false, 
          error: 'Entrenamiento ID, ejercicio ID y número de set son requeridos' 
        }, { status: 400 })
      }

      // Verificar que el entrenamiento pertenece al usuario
      const entrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, body.entrenamientoId), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (entrenamiento.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Entrenamiento no encontrado' 
        }, { status: 404 })
      }

      // Validar RPE si se proporciona
      if (body.rpe && (body.rpe < 1 || body.rpe > 10)) {
        return Response.json({ 
          success: false, 
          error: 'RPE debe estar entre 1 y 10' 
        }, { status: 400 })
      }

      // Crear set
      const setData = {
        entrenamientoId: body.entrenamientoId,
        ejercicioId: body.ejercicioId,
        setNumber: body.setNumber,
        reps: body.reps || null,
        weight: body.weight || null,
        duration: body.duration || null,
        completed: body.completed || false,
        restTime: body.restTime || null,
        rpe: body.rpe || null,
        notes: body.notes || ''
      }

      const [newSet] = await db
        .insert(sets)
        .values(setData)
        .returning()

      return Response.json({ 
        success: true, 
        data: newSet,
        message: 'Set creado exitosamente' 
      }, { status: 201 })

    } catch (error) {
      console.error('Error creating set:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al crear set' 
      }, { status: 500 })
    }
  })
}

// PUT: Actualizar set
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { id, ...updateData } = body

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de set requerido' 
        }, { status: 400 })
      }

      // Verificar que el set pertenece al usuario a través del entrenamiento
      const existingSet = await db
        .select({
          setId: sets.id,
          entrenamientoId: sets.entrenamientoId,
          userId: entrenamientos.userId
        })
        .from(sets)
        .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
        .where(eq(sets.id, id))
        .limit(1)

      if (existingSet.length === 0 || existingSet[0].userId !== user.userId) {
        return Response.json({ 
          success: false, 
          error: 'Set no encontrado' 
        }, { status: 404 })
      }

      // Validar RPE si se actualiza
      if (updateData.rpe && (updateData.rpe < 1 || updateData.rpe > 10)) {
        return Response.json({ 
          success: false, 
          error: 'RPE debe estar entre 1 y 10' 
        }, { status: 400 })
      }

      // Actualizar set
      const setUpdateData: any = {}

      if (updateData.reps !== undefined) setUpdateData.reps = updateData.reps
      if (updateData.weight !== undefined) setUpdateData.weight = updateData.weight
      if (updateData.duration !== undefined) setUpdateData.duration = updateData.duration
      if (updateData.completed !== undefined) setUpdateData.completed = updateData.completed
      if (updateData.restTime !== undefined) setUpdateData.restTime = updateData.restTime
      if (updateData.rpe !== undefined) setUpdateData.rpe = updateData.rpe
      if (updateData.notes !== undefined) setUpdateData.notes = updateData.notes

      await db
        .update(sets)
        .set(setUpdateData)
        .where(eq(sets.id, id))

      return Response.json({ 
        success: true, 
        message: 'Set actualizado exitosamente' 
      })

    } catch (error) {
      console.error('Error updating set:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al actualizar set' 
      }, { status: 500 })
    }
  })
}

// DELETE: Eliminar set
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de set requerido' 
        }, { status: 400 })
      }

      // Verificar que el set pertenece al usuario a través del entrenamiento
      const existingSet = await db
        .select({
          setId: sets.id,
          entrenamientoId: sets.entrenamientoId,
          userId: entrenamientos.userId
        })
        .from(sets)
        .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
        .where(eq(sets.id, id))
        .limit(1)

      if (existingSet.length === 0 || existingSet[0].userId !== user.userId) {
        return Response.json({ 
          success: false, 
          error: 'Set no encontrado' 
        }, { status: 404 })
      }

      // Eliminar set
      await db
        .delete(sets)
        .where(eq(sets.id, id))

      return Response.json({ 
        success: true, 
        message: 'Set eliminado exitosamente' 
      })

    } catch (error) {
      console.error('Error deleting set:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al eliminar set' 
      }, { status: 500 })
    }
  })
}