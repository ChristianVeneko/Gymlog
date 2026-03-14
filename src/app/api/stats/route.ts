import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { 
  entrenamientos, 
  sets, 
  ejercicios, 
  rutinas, 
  personalRecords, 
  userMetrics 
} from '@/lib/db/schema'
import { eq, and, sql, desc, gte, lte, count } from 'drizzle-orm'

// GET: Obtener estadísticas del usuario
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const type = searchParams.get('type') || 'overview'
      const startDate = searchParams.get('start_date') // YYYY-MM-DD
      const endDate = searchParams.get('end_date') // YYYY-MM-DD
      const ejercicioId = searchParams.get('ejercicio_id')

      // Construir condiciones base
      let dateConditions = eq(entrenamientos.userId, user.userId)
      
      if (startDate) {
        dateConditions = and(dateConditions, gte(entrenamientos.fecha, startDate)) as any
      }
      if (endDate) {
        dateConditions = and(dateConditions, lte(entrenamientos.fecha, endDate)) as any
      }

      switch (type) {
        case 'overview':
          return await getOverviewStats(user.userId, dateConditions)
        
        case 'progress':
          return await getProgressStats(user.userId, dateConditions, ejercicioId)
        
        case 'volume':
          return await getVolumeStats(user.userId, dateConditions)
        
        case 'frequency':
          return await getFrequencyStats(user.userId, dateConditions)
        
        case 'personal_records':
          return await getPersonalRecords(user.userId, ejercicioId)
        
        case 'body_metrics':
          return await getBodyMetrics(user.userId, startDate, endDate)
        
        case 'last_sets':
          return await getLastSets(user.userId, searchParams.get('ejercicio_ids'))
          
        case 'detailed':
          // ✅ AGREGADO: Alias para overview con más detalles
          return await getOverviewStats(user.userId, dateConditions)
        
        default:
          return Response.json({
            success: false,
            error: 'Tipo de estadística no válido'
          }, { status: 400 })
      }

    } catch (error) {
      console.error('Error fetching stats:', error)
      return Response.json({
        success: false,
        error: 'Error al obtener estadísticas'
      }, { status: 500 })
    }
  })
}

// Estadísticas generales
async function getOverviewStats(userId: string, dateConditions: any) {
  try {
    // Total de entrenamientos
    const totalWorkouts = await db
      .select({ count: count() })
      .from(entrenamientos)
      .where(and(dateConditions, eq(entrenamientos.completed, true)))

    // Total de ejercicios únicos
    const uniqueExercises = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${sets.ejercicioId})` 
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .where(dateConditions)

    // Volumen total (peso x reps)
    const totalVolume = await db
      .select({
        volume: sql<number>`COALESCE(SUM(${sets.weight} * ${sets.reps}), 0)`
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .where(and(dateConditions, eq(sets.completed, true)))

    // Total de sets completados
    const totalSets = await db
      .select({ count: count() })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .where(and(dateConditions, eq(sets.completed, true)))

    // Duración promedio de entrenamientos
    const avgDuration = await db
      .select({
        duration: sql<number>`AVG(${entrenamientos.duration})`
      })
      .from(entrenamientos)
      .where(and(dateConditions, eq(entrenamientos.completed, true)))

    // Entrenamientos por semana (últimas 4 semanas)
    const weeklyWorkouts = await db
      .select({
        week: sql<string>`strftime('%Y-%W', ${entrenamientos.fecha})`,
        count: count()
      })
      .from(entrenamientos)
      .where(and(
        eq(entrenamientos.userId, userId),
        eq(entrenamientos.completed, true),
        gte(entrenamientos.fecha, sql<string>`date('now', '-4 weeks')`)
      ))
      .groupBy(sql`strftime('%Y-%W', ${entrenamientos.fecha})`)
      .orderBy(sql`strftime('%Y-%W', ${entrenamientos.fecha})`)

    // ✅ NUEVO: Calcular racha de días consecutivos
    const allWorkouts = await db
      .select({
        fecha: entrenamientos.fecha
      })
      .from(entrenamientos)
      .where(and(
        eq(entrenamientos.userId, userId),
        eq(entrenamientos.completed, true)
      ))
      .orderBy(desc(entrenamientos.fecha))

    let streak = 0
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0]

    if (allWorkouts.length > 0) {
      const lastWorkout = allWorkouts[0].fecha
      
      // Solo contar racha si el último entrenamiento fue hoy o ayer
      if (lastWorkout === todayStr || lastWorkout === yesterdayStr) {
        streak = 1
        let currentDate = new Date(lastWorkout)
        
        for (let i = 1; i < allWorkouts.length; i++) {
          const prevDate = new Date(currentDate)
          prevDate.setDate(prevDate.getDate() - 1)
          const expectedDate = prevDate.toISOString().split('T')[0]
          
          if (allWorkouts[i].fecha === expectedDate) {
            streak++
            currentDate = new Date(allWorkouts[i].fecha)
          } else {
            break
          }
        }
      }
    }

    // ✅ NUEVO: Peso máximo levantado en un solo set
    const maxWeight = await db
      .select({
        weight: sql<number>`MAX(${sets.weight})`
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .where(and(dateConditions, eq(sets.completed, true)))

    return Response.json({
      success: true,
      data: {
        totalWorkouts: totalWorkouts[0]?.count || 0,
        uniqueExercises: uniqueExercises[0]?.count || 0,
        totalVolume: totalVolume[0]?.volume || 0,
        totalSets: totalSets[0]?.count || 0,
        avgDuration: Math.round(avgDuration[0]?.duration || 0),
        weeklyWorkouts: weeklyWorkouts || [],
        streak, // ✅ Racha de días consecutivos
        maxWeight: maxWeight[0]?.weight || 0 // ✅ Peso máximo
      }
    })

  } catch (error) {
    console.error('Error in getOverviewStats:', error)
    throw error
  }
}

// Progreso de ejercicios específicos
async function getProgressStats(userId: string, dateConditions: any, ejercicioId?: string | null) {
  try {
    let exerciseConditions = dateConditions
    
    if (ejercicioId) {
      exerciseConditions = and(exerciseConditions, eq(sets.ejercicioId, ejercicioId)) as any
    }

    // Progreso de peso máximo por ejercicio
    const weightProgress = await db
      .select({
        ejercicioId: sets.ejercicioId,
        ejercicioName: ejercicios.nameEs,
        fecha: entrenamientos.fecha,
        maxWeight: sql<number>`MAX(${sets.weight})`,
        maxReps: sql<number>`MAX(${sets.reps})`
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
      .where(and(exerciseConditions, eq(sets.completed, true)))
      .groupBy(sets.ejercicioId, entrenamientos.fecha)
      .orderBy(entrenamientos.fecha, sets.ejercicioId)

    // Agrupar por ejercicio
    const progressByExercise = weightProgress.reduce((acc: any, record: any) => {
      const exerciseId = record.ejercicioId
      if (!acc[exerciseId]) {
        acc[exerciseId] = {
          ejercicioId: exerciseId,
          ejercicioName: record.ejercicioName,
          data: []
        }
      }
      acc[exerciseId].data.push({
        fecha: record.fecha,
        maxWeight: record.maxWeight,
        maxReps: record.maxReps
      })
      return acc
    }, {})

    return Response.json({
      success: true,
      data: Object.values(progressByExercise)
    })

  } catch (error) {
    console.error('Error in getProgressStats:', error)
    throw error
  }
}

// Estadísticas de volumen
async function getVolumeStats(userId: string, dateConditions: any) {
  try {
    // Volumen por día
    const dailyVolume = await db
      .select({
        fecha: entrenamientos.fecha,
        volume: sql<number>`COALESCE(SUM(${sets.weight} * ${sets.reps}), 0)`
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .where(and(dateConditions, eq(sets.completed, true)))
      .groupBy(entrenamientos.fecha)
      .orderBy(entrenamientos.fecha)

    // Volumen por grupo muscular
    const volumeByBodyPart = await db
      .select({
        bodyPart: ejercicios.bodyPart,
        volume: sql<number>`COALESCE(SUM(${sets.weight} * ${sets.reps}), 0)`
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
      .where(and(dateConditions, eq(sets.completed, true)))
      .groupBy(ejercicios.bodyPart)
      .orderBy(sql`SUM(${sets.weight} * ${sets.reps}) DESC`)

    return Response.json({
      success: true,
      data: {
        dailyVolume: dailyVolume || [],
        volumeByBodyPart: volumeByBodyPart || []
      }
    })

  } catch (error) {
    console.error('Error in getVolumeStats:', error)
    throw error
  }
}

// Estadísticas de frecuencia
async function getFrequencyStats(userId: string, dateConditions: any) {
  try {
    // Entrenamientos por día de la semana
    const workoutsByDayOfWeek = await db
      .select({
        dayOfWeek: sql<string>`strftime('%w', ${entrenamientos.fecha})`,
        count: count()
      })
      .from(entrenamientos)
      .where(and(dateConditions, eq(entrenamientos.completed, true)))
      .groupBy(sql`strftime('%w', ${entrenamientos.fecha})`)

    // Frecuencia de ejercicios
    const exerciseFrequency = await db
      .select({
        ejercicioId: sets.ejercicioId,
        ejercicioName: ejercicios.nameEs,
        frequency: count()
      })
      .from(sets)
      .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
      .leftJoin(ejercicios, eq(sets.ejercicioId, ejercicios.id))
      .where(and(dateConditions, eq(sets.completed, true)))
      .groupBy(sets.ejercicioId, ejercicios.nameEs)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10)

    return Response.json({
      success: true,
      data: {
        workoutsByDayOfWeek: workoutsByDayOfWeek || [],
        exerciseFrequency: exerciseFrequency || []
      }
    })

  } catch (error) {
    console.error('Error in getFrequencyStats:', error)
    throw error
  }
}

// Records personales
async function getPersonalRecords(userId: string, ejercicioId?: string | null) {
  try {
    let whereConditions = eq(personalRecords.userId, userId)
    
    if (ejercicioId) {
      whereConditions = and(whereConditions, eq(personalRecords.ejercicioId, ejercicioId)) as any
    }

    const records = await db
      .select({
        id: personalRecords.id,
        ejercicioId: personalRecords.ejercicioId,
        ejercicioName: ejercicios.nameEs,
        type: personalRecords.type,
        value: personalRecords.value,
        reps: personalRecords.reps,
        fecha: personalRecords.fecha
      })
      .from(personalRecords)
      .leftJoin(ejercicios, eq(personalRecords.ejercicioId, ejercicios.id))
      .where(whereConditions)
      .orderBy(desc(personalRecords.fecha))

    return Response.json({
      success: true,
      data: records || []
    })

  } catch (error) {
    console.error('Error in getPersonalRecords:', error)
    throw error
  }
}

// Métricas corporales
async function getBodyMetrics(userId: string, startDate?: string | null, endDate?: string | null) {
  try {
    let whereConditions = eq(userMetrics.userId, userId)
    
    if (startDate) {
      whereConditions = and(whereConditions, gte(userMetrics.fecha, startDate)) as any
    }
    if (endDate) {
      whereConditions = and(whereConditions, lte(userMetrics.fecha, endDate)) as any
    }

    const metrics = await db
      .select()
      .from(userMetrics)
      .where(whereConditions)
      .orderBy(userMetrics.fecha)

    return Response.json({
      success: true,
      data: metrics || []
    })

  } catch (error) {
    console.error('Error in getBodyMetrics:', error)
    throw error
  }
}

// Obtener últimos sets completados para una lista de ejercicios
async function getLastSets(userId: string, ejercicioIdsStr: string | null) {
  try {
    if (!ejercicioIdsStr) {
      return Response.json({ success: true, data: {} })
    }

    const exerciseIds = ejercicioIdsStr.split(',').filter(id => id.trim().length > 0)
    if (exerciseIds.length === 0) {
      return Response.json({ success: true, data: {} })
    }

    const results: Record<string, any[]> = {}

    // Para cada ejercicio, buscar el entrenamiento más reciente donde se completó, y traer esos sets
    for (const exId of exerciseIds) {
      const latestWorkout = await db
        .select({
          entrenamientoId: sets.entrenamientoId
        })
        .from(sets)
        .leftJoin(entrenamientos, eq(sets.entrenamientoId, entrenamientos.id))
        .where(and(
          eq(entrenamientos.userId, userId),
          eq(entrenamientos.completed, true),
          eq(sets.ejercicioId, exId),
          eq(sets.completed, true)
        ))
        .orderBy(desc(entrenamientos.fecha))
        .limit(1)

      if (latestWorkout.length > 0 && latestWorkout[0]?.entrenamientoId) {
        const latestSets = await db
          .select({
            setNumber: sets.setNumber,
            weight: sets.weight,
            reps: sets.reps
          })
          .from(sets)
          .where(and(
            eq(sets.entrenamientoId, latestWorkout[0].entrenamientoId),
            eq(sets.ejercicioId, exId),
            eq(sets.completed, true)
          ))
          .orderBy(sets.setNumber)

        if (latestSets.length > 0) {
          results[exId] = latestSets
        }
      }
    }

    return Response.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Error in getLastSets:', error)
    throw error
  }
}