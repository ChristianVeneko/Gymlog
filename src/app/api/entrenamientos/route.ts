import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { entrenamientos, sets, rutinas, ejercicios, rutinaEjercicios } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getLocalTime } from '@/lib/utils/dateUtils'

interface SetRequest {
  ejercicioId: string
  setNumber: number
  reps?: number
  weight?: number
  duration?: number
  completed: boolean
  restTime?: number
  rpe?: number
  notes?: string
}

interface EntrenamientoRequest {
  rutinaId: string
  fecha: string // YYYY-MM-DD
  notes?: string
  sets?: SetRequest[]
}

// GET: Obtener entrenamientos del usuario
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const fecha = searchParams.get('fecha') // YYYY-MM-DD
      const rutinaId = searchParams.get('rutinaId')
      const includeStats = searchParams.get('include_stats') === 'true'
      const limit = parseInt(searchParams.get('limit') || '50')

      // Construir condiciones where
      let whereConditions = eq(entrenamientos.userId, user.userId)
      
      if (fecha) {
        whereConditions = and(whereConditions, eq(entrenamientos.fecha, fecha)) as any
      }
      
      if (rutinaId) {
        whereConditions = and(whereConditions, eq(entrenamientos.rutinaId, rutinaId)) as any
      }

      const userEntrenamientos = await db
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
        .where(whereConditions)
        .orderBy(desc(entrenamientos.fecha))
        .limit(limit)

      // Obtener sets para cada entrenamiento con información adicional
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
            .where(eq(sets.entrenamientoId, entrenamiento.id))
            .orderBy(sets.setNumber)

          // Obtener ejercicios de la rutina para determinar el día y músculos
          const ejerciciosRutina = await db
            .select({
              bodyPart: rutinaEjercicios.bodyPart,
              dayOfWeek: rutinaEjercicios.dayOfWeek,
              ejercicioNameEs: rutinaEjercicios.ejercicioNameEs
            })
            .from(rutinaEjercicios)
            .where(eq(rutinaEjercicios.rutinaId, entrenamiento.rutinaId))

          // Determinar día de la semana del entrenamiento
          const fechaObj = new Date(entrenamiento.fecha + 'T00:00:00')
          const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
          const diaEntrenamiento = diasSemana[fechaObj.getDay()]

          // Filtrar ejercicios del día del entrenamiento
          const ejerciciosDelDia = ejerciciosRutina.filter(ej => ej.dayOfWeek === diaEntrenamiento)

          // Mapeo de bodyParts en inglés a español
          const BODY_PART_TRANSLATIONS: Record<string, string> = {
            'back': 'Espalda',
            'cardio': 'Cardio',
            'chest': 'Pecho',
            'lower arms': 'Brazos',
            'lower legs': 'Piernas',
            'neck': 'Cuello',
            'shoulders': 'Hombros',
            'upper arms': 'Brazos',
            'upper legs': 'Piernas',
            'waist': 'Core'
          }

          // Contar músculos principales trabajados
          const musculosContados: Record<string, number> = {}
          ejerciciosDelDia.forEach(ej => {
            if (ej.bodyPart) {
              const translated = BODY_PART_TRANSLATIONS[ej.bodyPart] || ej.bodyPart
              musculosContados[translated] = (musculosContados[translated] || 0) + 1
            }
          })

          // Obtener los 2 músculos más trabajados
          const musculosPrincipales = Object.entries(musculosContados)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([musculo]) => musculo)

          // Generar título descriptivo
          let tituloEntrenamiento = entrenamiento.rutina?.name || 'Entrenamiento'
          if (musculosPrincipales.length > 0) {
            const musculos = musculosPrincipales.join(' y ')
            tituloEntrenamiento = `${diaEntrenamiento} (${musculos})`
          }

          // Calcular estadísticas básicas del entrenamiento
          const stats = includeStats ? {
            totalSets: entrenamientoSets.length,
            completedSets: entrenamientoSets.filter(s => s.completed).length,
            totalVolume: entrenamientoSets
              .filter(s => s.weight && s.reps)
              .reduce((acc, s) => acc + (s.weight! * s.reps!), 0),
            avgRPE: entrenamientoSets.filter(s => s.rpe).length > 0 
              ? entrenamientoSets.filter(s => s.rpe).reduce((acc, s) => acc + s.rpe!, 0) / entrenamientoSets.filter(s => s.rpe).length
              : null,
            exerciseCount: new Set(entrenamientoSets.map(s => s.ejercicioId)).size
          } : undefined

          return {
            ...entrenamiento,
            dayOfWeek: diaEntrenamiento,
            muscleGroups: musculosPrincipales,
            workoutTitle: tituloEntrenamiento,
            sets: entrenamientoSets,
            sets_count: entrenamientoSets.length, // ✅ AGREGADO: Contador de sets
            stats
          }
        })
      )

      return Response.json({ 
        success: true, 
        data: entrenamientosWithSets 
      })

    } catch (error) {
      console.error('Error fetching entrenamientos:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al obtener entrenamientos' 
      }, { status: 500 })
    }
  })
}

// POST: Crear nuevo entrenamiento
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body: EntrenamientoRequest = await req.json()

      // Validar datos requeridos
      if (!body.rutinaId || !body.fecha) {
        return Response.json({ 
          success: false, 
          error: 'Rutina ID y fecha son requeridos' 
        }, { status: 400 })
      }

      // Verificar que la rutina pertenece al usuario
      const rutina = await db
        .select()
        .from(rutinas)
        .where(and(eq(rutinas.id, body.rutinaId), eq(rutinas.userId, user.userId)))
        .limit(1)

      if (rutina.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Rutina no encontrada' 
        }, { status: 404 })
      }

      // Crear entrenamiento
      const clientTimezone = req.headers.get('X-Timezone') || undefined
      const entrenamientoData = {
        userId: user.userId,
        rutinaId: body.rutinaId,
        fecha: body.fecha,
        startTime: getLocalTime(clientTimezone),
        notes: body.notes || '',
        completed: false
      }

      const [newEntrenamiento] = await db
        .insert(entrenamientos)
        .values(entrenamientoData)
        .returning()

      // Si se proporcionan sets, crearlos
      if (body.sets && body.sets.length > 0) {
        const setsData = body.sets.map(set => ({
          entrenamientoId: newEntrenamiento.id,
          ejercicioId: set.ejercicioId,
          setNumber: set.setNumber,
          reps: set.reps || null,
          weight: set.weight || null,
          duration: set.duration || null,
          completed: set.completed,
          restTime: set.restTime || null,
          rpe: set.rpe || null,
          notes: set.notes || ''
        }))

        await db
          .insert(sets)
          .values(setsData)
      }

      return Response.json({ 
        success: true, 
        data: newEntrenamiento,
        message: 'Entrenamiento creado exitosamente' 
      }, { status: 201 })

    } catch (error) {
      console.error('Error creating entrenamiento:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al crear entrenamiento' 
      }, { status: 500 })
    }
  })
}

// PUT: Actualizar entrenamiento
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { id, ...updateData } = body

      if (!id) {
        return Response.json({ 
          success: false, 
          error: 'ID de entrenamiento requerido' 
        }, { status: 400 })
      }

      // Verificar que el entrenamiento pertenece al usuario
      const existingEntrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, id), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (existingEntrenamiento.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Entrenamiento no encontrado' 
        }, { status: 404 })
      }

      // Actualizar entrenamiento
      const entrenamientoUpdateData: any = {}

      if (updateData.endTime) entrenamientoUpdateData.endTime = updateData.endTime
      if (updateData.duration) entrenamientoUpdateData.duration = updateData.duration
      if (updateData.notes !== undefined) entrenamientoUpdateData.notes = updateData.notes
      if (updateData.completed !== undefined) {
        entrenamientoUpdateData.completed = updateData.completed
        if (updateData.completed && !updateData.endTime) {
          entrenamientoUpdateData.endTime = new Date().toTimeString().slice(0, 5)
        }
      }

      await db
        .update(entrenamientos)
        .set(entrenamientoUpdateData)
        .where(eq(entrenamientos.id, id))

      return Response.json({ 
        success: true, 
        message: 'Entrenamiento actualizado exitosamente' 
      })

    } catch (error) {
      console.error('Error updating entrenamiento:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al actualizar entrenamiento' 
      }, { status: 500 })
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
        return Response.json({ 
          success: false, 
          error: 'ID de entrenamiento requerido' 
        }, { status: 400 })
      }

      // Verificar que el entrenamiento pertenece al usuario
      const existingEntrenamiento = await db
        .select()
        .from(entrenamientos)
        .where(and(eq(entrenamientos.id, id), eq(entrenamientos.userId, user.userId)))
        .limit(1)

      if (existingEntrenamiento.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Entrenamiento no encontrado' 
        }, { status: 404 })
      }

      // Eliminar entrenamiento (sets se eliminan por CASCADE)
      await db
        .delete(entrenamientos)
        .where(eq(entrenamientos.id, id))

      return Response.json({ 
        success: true, 
        message: 'Entrenamiento eliminado exitosamente' 
      })

    } catch (error) {
      console.error('Error deleting entrenamiento:', error)
      return Response.json({ 
        success: false, 
        error: 'Error al eliminar entrenamiento' 
      }, { status: 500 })
    }
  })
}