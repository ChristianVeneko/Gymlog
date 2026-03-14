import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

// Cache para ejercicios paginados
const exerciseCache = new Map()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora

// Cache para TODOS los ejercicios de un bodyPart, evita múltiples loops
const bodyPartCache = new Map<string, { data: ExerciseDBExercise[], timestamp: number }>()
const BODYPART_CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 horas

interface ExerciseDBExercise {
  exerciseId: string
  name: string
  gifUrl: string
  targetMuscles: string[]
  bodyParts: string[]
  equipments: string[]
  secondaryMuscles: string[]
  instructions: string[]
}

interface ExerciseDBResponse {
  success: boolean
  metadata: {
    totalExercises: number
    totalPages: number
    currentPage: number
    previousPage?: string
    nextPage?: string
  }
  data: ExerciseDBExercise[]
}

interface ProcessedExercise {
  id: string
  name: string
  bodyPart: string
  equipment: string
  target: string
  instructions: string[]
  gifUrl: string
}

// Body parts válidos según la API de ExerciseDB
const VALID_BODY_PARTS = [
  'back', 'cardio', 'chest', 'lower arms', 'lower legs',
  'neck', 'shoulders', 'upper arms', 'upper legs', 'waist'
]

/**
 * Capitaliza un string para display
 */
function capitalize(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Obtiene tódos los ejercicios de una categoría (bodyPart) iterando la paginación de la API.
 */
async function fetchAllForBodyPart(bodyPart: string): Promise<ExerciseDBExercise[]> {
  const cached = bodyPartCache.get(bodyPart)
  if (cached && (Date.now() - cached.timestamp) < BODYPART_CACHE_DURATION) {
    return cached.data
  }

  const baseUrl = 'https://www.exercisedb.dev'
  let allData: ExerciseDBExercise[] = []
  let currentOffset = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({ limit: '100', offset: currentOffset.toString() })
    const url = `${baseUrl}/api/v1/bodyparts/${encodeURIComponent(bodyPart)}/exercises?${params.toString()}`

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GymLog-App/1.0' }
    })

    if (!response.ok) break
    const data: ExerciseDBResponse = await response.json()
    if (data.success && data.data && data.data.length > 0) {
      allData = allData.concat(data.data)
      if (data.data.length < 100) hasMore = false
      else currentOffset += 100
    } else {
      hasMore = false
    }
  }

  if (allData.length > 0) {
    bodyPartCache.set(bodyPart, { data: allData, timestamp: Date.now() })
  }
  return allData
}

/**
 * Obtiene ejercicios de la API oficial de ExerciseDB
 */
async function fetchExercisesFromAPI(
  search?: string,
  bodyPart?: string,
  limit: number = 30,
  offset: number = 0
): Promise<{ exercises: ProcessedExercise[], total: number }> {
  try {
    const baseUrl = 'https://www.exercisedb.dev'
    const safeLimit = Math.min(Math.max(limit, 1), 100)

    let url: string
    let response: Response

    if (bodyPart && search) {
      // Buscar dentro de un bodyPart: traer todos y filtrar localmente para no perder resultados por la paginación.
      const allExercises = await fetchAllForBodyPart(bodyPart)

      const searchLower = search.toLowerCase()
      const filtered = allExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchLower) ||
        (ex.targetMuscles && ex.targetMuscles.some(m => m.toLowerCase().includes(searchLower))) ||
        (ex.equipments && ex.equipments.some(eq => eq.toLowerCase().includes(searchLower)))
      )

      // Paginar manualmente los resultados filtrados
      const paged = filtered.slice(offset, offset + limit)

      return {
        exercises: paged.map(processExercise),
        total: filtered.length
      }
    } else if (bodyPart) {
      // Solo bodyPart: endpoint específico
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString()
      })
      url = `${baseUrl}/api/v1/bodyparts/${encodeURIComponent(bodyPart)}/exercises?${params.toString()}`
    } else if (search) {
      // Solo búsqueda general
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString(),
        search: search
      })
      url = `${baseUrl}/api/v1/exercises?${params.toString()}`
    } else {
      // Sin filtros: todos los ejercicios
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString(),
        sortBy: 'name',
        sortOrder: 'asc'
      })
      url = `${baseUrl}/api/v1/exercises?${params.toString()}`
    }

    response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GymLog-App/1.0' }
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: ExerciseDBResponse = await response.json()
    if (!data.success || !data.data) throw new Error('Invalid API response')

    return {
      exercises: data.data.map(processExercise),
      total: data.metadata?.totalExercises || data.data.length
    }

  } catch (error) {
    console.error('Error fetching exercises from API:', error)
    return getFallbackExercises(search, bodyPart, limit, offset)
  }
}

/**
 * Procesa un ejercicio de la API al formato interno
 */
function processExercise(exercise: ExerciseDBExercise): ProcessedExercise {
  return {
    id: exercise.exerciseId,
    name: capitalize(exercise.name),
    bodyPart: exercise.bodyParts[0] || 'unknown',
    equipment: exercise.equipments[0] || 'unknown',
    target: exercise.targetMuscles[0] || 'unknown',
    instructions: exercise.instructions || [],
    gifUrl: exercise.gifUrl || ''
  }
}

/**
 * Fallback con ejercicios estáticos cuando la API falla
 */
function getFallbackExercises(
  search?: string,
  bodyPart?: string,
  limit: number = 30,
  offset: number = 0
): { exercises: ProcessedExercise[], total: number } {
  const fallbackExercises: ProcessedExercise[] = [
    // Chest
    { id: "chest_1", name: "Push-Up", bodyPart: "chest", equipment: "body weight", target: "pectorals", instructions: [], gifUrl: "" },
    { id: "chest_2", name: "Incline Dumbbell Press", bodyPart: "chest", equipment: "dumbbell", target: "pectorals", instructions: [], gifUrl: "" },
    { id: "chest_3", name: "Bench Press", bodyPart: "chest", equipment: "barbell", target: "pectorals", instructions: [], gifUrl: "" },
    { id: "chest_4", name: "Cable Fly", bodyPart: "chest", equipment: "cable", target: "pectorals", instructions: [], gifUrl: "" },
    // Back
    { id: "back_1", name: "Pull-Up", bodyPart: "back", equipment: "body weight", target: "lats", instructions: [], gifUrl: "" },
    { id: "back_2", name: "Bent Over Row", bodyPart: "back", equipment: "barbell", target: "lats", instructions: [], gifUrl: "" },
    { id: "back_3", name: "Lat Pulldown", bodyPart: "back", equipment: "cable", target: "lats", instructions: [], gifUrl: "" },
    { id: "back_4", name: "Seated Cable Row", bodyPart: "back", equipment: "cable", target: "lats", instructions: [], gifUrl: "" },
    // Shoulders
    { id: "shoulders_1", name: "Shoulder Press", bodyPart: "shoulders", equipment: "dumbbell", target: "delts", instructions: [], gifUrl: "" },
    { id: "shoulders_2", name: "Lateral Raise", bodyPart: "shoulders", equipment: "dumbbell", target: "delts", instructions: [], gifUrl: "" },
    { id: "shoulders_3", name: "Face Pull", bodyPart: "shoulders", equipment: "cable", target: "rear deltoids", instructions: [], gifUrl: "" },
    // Upper Arms
    { id: "arms_1", name: "Bicep Curl", bodyPart: "upper arms", equipment: "dumbbell", target: "biceps", instructions: [], gifUrl: "" },
    { id: "arms_2", name: "Tricep Dips", bodyPart: "upper arms", equipment: "body weight", target: "triceps", instructions: [], gifUrl: "" },
    { id: "arms_3", name: "Hammer Curl", bodyPart: "upper arms", equipment: "dumbbell", target: "biceps", instructions: [], gifUrl: "" },
    // Upper Legs
    { id: "legs_1", name: "Squat", bodyPart: "upper legs", equipment: "barbell", target: "quads", instructions: [], gifUrl: "" },
    { id: "legs_2", name: "Lunges", bodyPart: "upper legs", equipment: "body weight", target: "quads", instructions: [], gifUrl: "" },
    { id: "legs_3", name: "Deadlift", bodyPart: "upper legs", equipment: "barbell", target: "glutes", instructions: [], gifUrl: "" },
    { id: "legs_4", name: "Leg Press", bodyPart: "upper legs", equipment: "leverage machine", target: "quads", instructions: [], gifUrl: "" },
    // Lower Legs
    { id: "lowerlegs_1", name: "Calf Raise", bodyPart: "lower legs", equipment: "body weight", target: "calves", instructions: [], gifUrl: "" },
    // Waist
    { id: "abs_1", name: "Plank", bodyPart: "waist", equipment: "body weight", target: "abs", instructions: [], gifUrl: "" },
    { id: "abs_2", name: "Crunches", bodyPart: "waist", equipment: "body weight", target: "abs", instructions: [], gifUrl: "" },
    { id: "abs_3", name: "Hanging Leg Raise", bodyPart: "waist", equipment: "body weight", target: "abs", instructions: [], gifUrl: "" },
    // Cardio
    { id: "cardio_1", name: "Burpees", bodyPart: "cardio", equipment: "body weight", target: "cardiovascular system", instructions: [], gifUrl: "" },
    { id: "cardio_2", name: "Jumping Jacks", bodyPart: "cardio", equipment: "body weight", target: "cardiovascular system", instructions: [], gifUrl: "" },
  ]

  let filtered = fallbackExercises

  if (bodyPart) {
    filtered = filtered.filter(ex => ex.bodyPart.toLowerCase() === bodyPart.toLowerCase())
  }
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(searchLower) ||
      ex.bodyPart.toLowerCase().includes(searchLower) ||
      ex.equipment.toLowerCase().includes(searchLower) ||
      ex.target.toLowerCase().includes(searchLower)
    )
  }

  const paged = filtered.slice(offset, offset + limit)
  return { exercises: paged, total: filtered.length }
}

/**
 * Obtiene la lista de body parts disponibles
 */
async function getAvailableBodyParts(): Promise<string[]> {
  try {
    const response = await fetch('https://www.exercisedb.dev/api/v1/bodyparts', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GymLog-App/1.0' }
    })
    if (response.ok) {
      const data = await response.json()
      return data.success ? data.data : VALID_BODY_PARTS
    }
  } catch (error) {
    console.error('Error fetching body parts:', error)
  }
  return VALID_BODY_PARTS
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const search = searchParams.get('search')
      const bodyPart = searchParams.get('bodyPart')
      const categories = searchParams.get('categories')
      const limit = parseInt(searchParams.get('limit') || '30')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Si se solicitan categorías, devolver lista de body parts
      if (categories === 'true') {
        const bodyParts = await getAvailableBodyParts()
        return Response.json({
          success: true,
          data: {
            bodyParts: bodyParts.map(bp => ({
              value: bp,
              label: capitalize(bp)
            }))
          }
        })
      }

      // Cache
      const cacheKey = `exercises_${search || 'all'}_${bodyPart || 'all'}_${limit}_${offset}`
      const cached = exerciseCache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return Response.json({
          success: true,
          data: cached.data.exercises,
          total: cached.data.total,
          pagination: {
            limit, offset,
            hasMore: (offset + limit) < cached.data.total
          }
        })
      }

      // Fetch exercises
      const result = await fetchExercisesFromAPI(
        search || undefined,
        bodyPart || undefined,
        limit,
        offset
      )

      // Cache
      exerciseCache.set(cacheKey, { data: result, timestamp: Date.now() })

      return Response.json({
        success: true,
        data: result.exercises,
        total: result.total,
        pagination: {
          limit, offset,
          hasMore: (offset + limit) < result.total
        }
      })

    } catch (error) {
      console.error('Error en API de ejercicios:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}