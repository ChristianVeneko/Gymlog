import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { rutinas, rutinaEjercicios, ejercicios } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

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
  reps?: string // Puede ser "8-12" o "12" o "45s"
  weight?: number
  restTime?: number // En segundos
  notes?: string
  order: number
}

interface RutinaRequest {
  name: string
  description?: string
  daysOfWeek?: string[] // ["lunes", "miércoles", "viernes"]
  ejercicios: RutinaEjercicio[]
  isActive?: boolean
}

// GET: Obtener rutinas del usuario
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const isActive = searchParams.get('active')
      const includeEjercicios = searchParams.get('include_ejercicios') !== 'false'

      // Construir condiciones where
      let whereConditions = eq(rutinas.userId, user.userId)
      
      if (isActive === 'true') {
        whereConditions = and(whereConditions, eq(rutinas.isActive, true)) as any
      } else if (isActive === 'false') {
        whereConditions = and(whereConditions, eq(rutinas.isActive, false)) as any
      }

      const userRutinas = await db
        .select()
        .from(rutinas)
        .where(whereConditions)
        .orderBy(rutinas.createdAt)

      if (!includeEjercicios) {
        // Obtener conteo total de ejercicios para cada rutina
        const rutinasWithCount = await Promise.all(
          userRutinas.map(async (rutina) => {
            // Contar TODOS los ejercicios (no solo únicos)
            const countResult = await db
              .select({ 
                count: sql<number>`COUNT(*)` 
              })
              .from(rutinaEjercicios)
              .where(eq(rutinaEjercicios.rutinaId, rutina.id))
            
            return {
              ...rutina,
              daysOfWeek: rutina.daysOfWeek ? JSON.parse(rutina.daysOfWeek) : [],
              ejercicios_count: Number(countResult[0]?.count || 0)
            }
          })
        )
        
        return Response.json({ 
          success: true, 
          data: rutinasWithCount 
        })
      }

      // Obtener ejercicios para cada rutina
      const rutinasWithEjercicios = await Promise.all(
        userRutinas.map(async (rutina) => {
          const rutinasEjercicios = await db
            .select({
              id: rutinaEjercicios.id,
              ejercicioId: rutinaEjercicios.ejercicioId,
              dayOfWeek: rutinaEjercicios.dayOfWeek, // ✅ AGREGADO
              sets: rutinaEjercicios.sets,
              reps: rutinaEjercicios.reps,
              weight: rutinaEjercicios.weight,
              restTime: rutinaEjercicios.restTime,
              order: rutinaEjercicios.order,
              notes: rutinaEjercicios.notes,
              ejercicio: {
                id: ejercicios.id,
                name: ejercicios.name,
                nameEs: ejercicios.nameEs,
                bodyPart: ejercicios.bodyPart,
                equipment: ejercicios.equipment,
                target: ejercicios.target,
                gifUrl: ejercicios.gifUrl
              },
              // Fallback data from rutinaEjercicios in case ejercicios table is missing data
              fallbackName: rutinaEjercicios.ejercicioName,
              fallbackNameEs: rutinaEjercicios.ejercicioNameEs,
              fallbackBodyPart: rutinaEjercicios.bodyPart,
              fallbackEquipment: rutinaEjercicios.equipment,
              fallbackTarget: rutinaEjercicios.target,
              fallbackGifUrl: rutinaEjercicios.gifUrl
            })
            .from(rutinaEjercicios)
            .leftJoin(ejercicios, eq(rutinaEjercicios.ejercicioId, ejercicios.id))
            .where(eq(rutinaEjercicios.rutinaId, rutina.id))
            .orderBy(rutinaEjercicios.order)

          // Fix null ejercicio data by using fallback data
          const processedEjercicios = rutinasEjercicios.map(item => {
            const bodyPart = item.ejercicio?.bodyPart || item.fallbackBodyPart || 'N/A'
            return {
              id: item.id,
              ejercicioId: item.ejercicioId,
              dayOfWeek: item.dayOfWeek, // ✅ AGREGADO
              bodyPart, // ✅ AGREGADO para fácil acceso
              sets: item.sets,
              reps: item.reps,
              weight: item.weight,
              restTime: item.restTime,
              order: item.order,
              notes: item.notes,
              ejercicio: {
                id: item.ejercicio?.id || item.ejercicioId,
                name: item.ejercicio?.name || item.fallbackName || 'Ejercicio desconocido',
                nameEs: item.ejercicio?.nameEs || item.fallbackNameEs || item.ejercicio?.name || item.fallbackName || 'Ejercicio desconocido',
                bodyPart,
                equipment: item.ejercicio?.equipment || item.fallbackEquipment || 'N/A',
                target: item.ejercicio?.target || item.fallbackTarget || 'N/A',
                gifUrl: item.ejercicio?.gifUrl || item.fallbackGifUrl || ''
              }
            }
          })

          return {
            ...rutina,
            daysOfWeek: rutina.daysOfWeek ? JSON.parse(rutina.daysOfWeek) : [],
            ejercicios: processedEjercicios
          }
        })
      )

      return Response.json({ 
        success: true, 
        data: rutinasWithEjercicios 
      })

    } catch (error) {
      console.error('Error fetching rutinas:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al obtener rutinas' 
      }, { status: 500 })
    }
  })
}

// POST: Crear nueva rutina
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body: RutinaRequest = await req.json()

      // Validar datos requeridos
      if (!body.name || !body.ejercicios || body.ejercicios.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Nombre y ejercicios son requeridos' 
        }, { status: 400 })
      }

      // Crear rutina
      const rutinaData = {
        userId: user.userId,
        name: body.name,
        description: body.description || '',
        daysOfWeek: body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : null,
        isActive: body.isActive ?? true
      }

      const [newRutina] = await db
        .insert(rutinas)
        .values(rutinaData)
        .returning()

      // Crear ejercicios de la rutina
      const ejerciciosData = body.ejercicios.map((ejercicio, index) => ({
        rutinaId: newRutina.id,
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

      return Response.json({ 
        success: true, 
        data: newRutina,
        message: 'Rutina creada exitosamente' 
      }, { status: 201 })

    } catch (error) {
      console.error('Error creating rutina:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al crear rutina' 
      }, { status: 500 })
    }
  })
}

// PUT: Actualizar rutina
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { id, ...updateData } = body

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
      const rutinaUpdateData: any = {
        updatedAt: sql`CURRENT_TIMESTAMP`
      }

      if (updateData.name) rutinaUpdateData.name = updateData.name
      if (updateData.description !== undefined) rutinaUpdateData.description = updateData.description
      if (updateData.daysOfWeek) rutinaUpdateData.daysOfWeek = JSON.stringify(updateData.daysOfWeek)
      if (updateData.isActive !== undefined) rutinaUpdateData.isActive = updateData.isActive

      await db
        .update(rutinas)
        .set(rutinaUpdateData)
        .where(eq(rutinas.id, id))

      // Si se proporcionan ejercicios, actualizar
      if (updateData.ejercicios) {
        // Eliminar ejercicios existentes
        await db
          .delete(rutinaEjercicios)
          .where(eq(rutinaEjercicios.rutinaId, id))

        // Insertar nuevos ejercicios
        const ejerciciosData = updateData.ejercicios.map((ejercicio: RutinaEjercicio, index: number) => ({
          rutinaId: id,
          ejercicioId: ejercicio.ejercicioId,
          sets: ejercicio.sets,
          reps: ejercicio.reps,
          weight: ejercicio.weight || null,
          restTime: ejercicio.restTime || 60,
          notes: ejercicio.notes || '',
          order: ejercicio.order ?? index + 1
        }))

        if (ejerciciosData.length > 0) {
          await db
            .insert(rutinaEjercicios)
            .values(ejerciciosData)
        }
      }

      return Response.json({ 
        success: true, 
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

// DELETE: Eliminar rutina
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')

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

      // Eliminar rutina (ejercicios se eliminan por CASCADE)
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