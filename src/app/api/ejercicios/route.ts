import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

// Cache para ejercicios
const exerciseCache = new Map()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora

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
  nameEs: string
  bodyPart: string
  bodyPartEs: string
  equipment: string
  equipmentEs: string
  target: string
  targetEs: string
  instructions: string[]
  gifUrl: string
}

// Diccionario de traducción español -> inglés EXACTO según la API oficial
const searchTranslations: Record<string, string> = {
  // Partes del cuerpo - EXACTAMENTE como en la API
  'pecho': 'chest',
  'espalda': 'back', 
  'hombros': 'shoulders',
  'brazos': 'upper arms',           // API usa "upper arms"
  'antebrazos': 'lower arms',       // API usa "lower arms"
  'piernas': 'upper legs',          // API usa "upper legs"
  'pantorrillas': 'lower legs',     // API usa "lower legs"
  'abdomen': 'waist',               // API usa "waist"
  'abdominales': 'waist',
  'core': 'waist',
  'cardio': 'cardio',
  'cuello': 'neck',
  
  // Músculos específicos - EXACTAMENTE como en la API
  'biceps': 'biceps',
  'bíceps': 'biceps',
  'triceps': 'triceps',
  'tríceps': 'triceps',
  'cuadriceps': 'quadriceps',
  'cuádriceps': 'quadriceps',
  'quads': 'quads',
  'isquiotibiales': 'hamstrings',
  'gluteos': 'glutes',
  'glúteos': 'glutes',
  'deltoides': 'deltoids',
  'delts': 'delts',
  'pectorales': 'pectorals',
  'pecs': 'pectorals',
  'dorsales': 'latissimus dorsi',
  'lats': 'lats',
  'trapecio': 'trapezius',
  'traps': 'traps',
  'romboides': 'rhomboids',
  'serratos': 'serratus anterior',
  'oblicuos': 'obliques',
  'abs': 'abs',
  'calves': 'calves',
  'gemelos': 'calves',
  'espalda baja': 'lower back',
  'espalda alta': 'upper back',
  'pecho superior': 'upper chest',
  'abdominales inferiores': 'lower abs',
  
  // Equipamiento
  'peso corporal': 'body weight',
  'mancuernas': 'dumbbell',
  'barra': 'barbell',
  'cables': 'cable',
  'máquina': 'leverage machine',
  'pesa rusa': 'kettlebell',
  'banda elástica': 'resistance band',
  'pelota': 'stability ball',
  'banco': 'bench',
  'smith': 'smith machine',
  'polea': 'cable',
  
  // Ejercicios comunes
  'flexiones': 'push',
  'sentadillas': 'squat',
  'peso muerto': 'deadlift',
  'press banca': 'bench press',
  'dominadas': 'pull up',
  'plancha': 'plank',
  'zancadas': 'lunge',
  'burpees': 'burpee',
  'curl': 'curl',
  'press': 'press',
  'elevaciones': 'raise',
  'fondos': 'dip',
  'remo': 'row'
}

// Traducción inversa inglés -> español COMPLETA según la API oficial
const displayTranslations: Record<string, string> = {
  // Partes del cuerpo (body parts de la API)
  'chest': 'Pecho',
  'back': 'Espalda',
  'shoulders': 'Hombros', 
  'upper arms': 'Brazos',
  'lower arms': 'Antebrazos',
  'upper legs': 'Piernas',
  'lower legs': 'Pantorrillas',
  'waist': 'Abdominales/Core',
  'neck': 'Cuello',
  'cardio': 'Cardio',
  
  // Músculos específicos (todos los de la API)
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'quadriceps': 'Cuádriceps',
  'quads': 'Cuádriceps',
  'hamstrings': 'Isquiotibiales',
  'glutes': 'Glúteos',
  'delts': 'Deltoides',
  'deltoids': 'Deltoides',
  'rear deltoids': 'Deltoides posteriores',
  'pectorals': 'Pectorales',
  'pecs': 'Pectorales',
  'upper chest': 'Pecho superior',
  'lats': 'Dorsales',
  'latissimus dorsi': 'Dorsal ancho',
  'traps': 'Trapecio',
  'trapezius': 'Trapecio',
  'rhomboids': 'Romboides',
  'serratus anterior': 'Serrato anterior',
  'obliques': 'Oblicuos',
  'abdominals': 'Abdominales',
  'abs': 'Abdominales',
  'lower abs': 'Abdominales inferiores',
  'core': 'Core',
  'calves': 'Gemelos',
  'soleus': 'Sóleo',
  'shins': 'Espinillas',
  'lower back': 'Espalda baja',
  'upper back': 'Espalda alta',
  'spine': 'Columna',
  'hip flexors': 'Flexores de cadera',
  'adductors': 'Aductores',
  'abductors': 'Abductores',
  'inner thighs': 'Parte interna del muslo',
  'groin': 'Ingle',
  'forearms': 'Antebrazos',
  'wrists': 'Muñecas',
  'wrist flexors': 'Flexores de muñeca',
  'wrist extensors': 'Extensores de muñeca',
  'grip muscles': 'Músculos de agarre',
  'hands': 'Manos',
  'feet': 'Pies',
  'ankles': 'Tobillos',
  'ankle stabilizers': 'Estabilizadores de tobillo',
  'brachialis': 'Braquial',
  'rotator cuff': 'Manguito rotador',
  'levator scapulae': 'Elevador de la escápula',
  'sternocleidomastoid': 'Esternocleidomastoideo',
  'cardiovascular system': 'Sistema cardiovascular',
  
  // Equipamiento
  'body weight': 'Peso corporal',
  'dumbbell': 'Mancuernas',
  'barbell': 'Barra',
  'cable': 'Cables',
  'leverage machine': 'Máquina',
  'smith machine': 'Máquina Smith',
  'kettlebell': 'Pesa rusa',
  'resistance band': 'Banda elástica',
  'stability ball': 'Pelota de estabilidad',
  'medicine ball': 'Balón medicinal',
  'bench': 'Banco',
  'pull up bar': 'Barra de dominadas',
  'olympic barbell': 'Barra olímpica',
  'ez barbell': 'Barra EZ'
}

// Función para traducir términos de búsqueda
function translateSearchTerm(spanishTerm: string): string {
  const term = spanishTerm.toLowerCase().trim()
  
  // Buscar traducción exacta
  if (searchTranslations[term]) {
    return searchTranslations[term]
  }
  
  // Buscar traducción parcial
  for (const [spanish, english] of Object.entries(searchTranslations)) {
    if (term.includes(spanish)) {
      return english
    }
  }
  
  // Si no encuentra traducción, devolver el término original
  return term
}

// Función para traducir nombres de ejercicios
function translateExerciseName(englishName: string): string {
  let translatedName = englishName
  
  // Aplicar traducciones de palabras comunes
  const commonTranslations: Record<string, string> = {
    'push up': 'Flexiones',
    'push-up': 'Flexiones', 
    'squat': 'Sentadillas',
    'deadlift': 'Peso Muerto',
    'bench press': 'Press de Banca',
    'pull up': 'Dominadas',
    'pull-up': 'Dominadas',
    'plank': 'Plancha',
    'lunge': 'Zancadas',
    'burpee': 'Burpees',
    'bicep curl': 'Curl de Bíceps',
    'tricep': 'Tríceps',
    'shoulder press': 'Press de Hombros',
    'lateral raise': 'Elevaciones Laterales',
    'calf raise': 'Elevaciones de Pantorrilla',
    'crunch': 'Encogimientos',
    'dip': 'Fondos',
    'row': 'Remo'
  }
  
  const lowerName = englishName.toLowerCase()
  for (const [english, spanish] of Object.entries(commonTranslations)) {
    if (lowerName.includes(english)) {
      translatedName = lowerName.replace(english, spanish)
      break
    }
  }
  
  // Si no hay traducción específica, capitalizar
  if (translatedName === englishName) {
    translatedName = englishName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  return translatedName
}

// Función para obtener ejercicios usando la API oficial de ExerciseDB
async function fetchExercisesFromAPI(
  search?: string, 
  bodyPart?: string,
  muscle?: string,
  limit: number = 25, 
  offset: number = 0
): Promise<{ exercises: ProcessedExercise[], total: number }> {
  try {
    const baseUrl = 'https://www.exercisedb.dev'
    let url: string
    let response: Response
    
    // Traducir términos si están en español
    let searchTerm = search ? translateSearchTerm(search) : undefined
    let bodyPartFilter = bodyPart ? translateSearchTerm(bodyPart) : undefined
    let muscleFilter = muscle ? translateSearchTerm(muscle) : undefined
    
    console.log('🔍 API Request - Search:', searchTerm, 'BodyPart:', bodyPartFilter, 'Muscle:', muscleFilter)
    

    // Estrategia combinada: si hay bodyPart y search, primero filtrar por bodyPart, luego filtrar por search en los resultados
    // Permitir hasta 100 por página
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    if (bodyPartFilter && searchTerm) {
      // 1. Obtener todos los ejercicios del bodyPart
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString()
      })
      url = `${baseUrl}/api/v1/bodyparts/${encodeURIComponent(bodyPartFilter)}/exercises?${params.toString()}`
      console.log('🌐 Fetching from:', url)
      response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GymLog-App/1.0'
        }
      })
      if (!response.ok) {
        console.error(`ExerciseDB API error: ${response.status} - ${response.statusText}`)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: ExerciseDBResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error('API returned invalid data structure')
      }
      // 2. Filtrar por searchTerm en los resultados
      const filtered = data.data.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exercise.targetMuscles && exercise.targetMuscles.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (exercise.bodyParts && exercise.bodyParts.some(bp => bp.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      const processedExercises: ProcessedExercise[] = filtered.map(exercise => ({
        id: exercise.exerciseId,
        name: exercise.name,
        nameEs: translateExerciseName(exercise.name),
        bodyPart: exercise.bodyParts[0] || 'unknown',
        bodyPartEs: displayTranslations[exercise.bodyParts[0]] || exercise.bodyParts[0] || 'Desconocido',
        equipment: exercise.equipments[0] || 'unknown',
        equipmentEs: displayTranslations[exercise.equipments[0]] || exercise.equipments[0] || 'Desconocido',
        target: exercise.targetMuscles[0] || 'unknown',
        targetEs: displayTranslations[exercise.targetMuscles[0]] || exercise.targetMuscles[0] || 'Desconocido',
        instructions: exercise.instructions || [],
        gifUrl: exercise.gifUrl || ''
      }))
      return {
        exercises: processedExercises,
        total: processedExercises.length
      }
    } else if (bodyPartFilter) {
      // Usar endpoint específico de body parts
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString()
      })
      url = `${baseUrl}/api/v1/bodyparts/${encodeURIComponent(bodyPartFilter)}/exercises?${params.toString()}`
    } else if (muscleFilter) {
      // Usar endpoint específico de músculos
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString(),
        includeSecondary: 'true'
      })
      url = `${baseUrl}/api/v1/muscles/${encodeURIComponent(muscleFilter)}/exercises?${params.toString()}`
    } else {
      // Usar búsqueda general
      const params = new URLSearchParams({
        limit: safeLimit.toString(),
        offset: offset.toString(),
        sortBy: 'name',
        sortOrder: 'asc'
      })
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      url = `${baseUrl}/api/v1/exercises?${params.toString()}`
    }

    console.log('🌐 Fetching from:', url)
    response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GymLog-App/1.0'
      }
    })
    if (!response.ok) {
      console.error(`ExerciseDB API error: ${response.status} - ${response.statusText}`)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data: ExerciseDBResponse = await response.json()
    if (!data.success || !data.data) {
      throw new Error('API returned invalid data structure')
    }
    // Procesar ejercicios
    const processedExercises: ProcessedExercise[] = data.data.map(exercise => ({
      id: exercise.exerciseId,
      name: exercise.name,
      nameEs: translateExerciseName(exercise.name),
      bodyPart: exercise.bodyParts[0] || 'unknown',
      bodyPartEs: displayTranslations[exercise.bodyParts[0]] || exercise.bodyParts[0] || 'Desconocido',
      equipment: exercise.equipments[0] || 'unknown',
      equipmentEs: displayTranslations[exercise.equipments[0]] || exercise.equipments[0] || 'Desconocido',
      target: exercise.targetMuscles[0] || 'unknown',
      targetEs: displayTranslations[exercise.targetMuscles[0]] || exercise.targetMuscles[0] || 'Desconocido',
      instructions: exercise.instructions || [],
      gifUrl: exercise.gifUrl || ''
    }))
    console.log(`✅ Fetched ${processedExercises.length} exercises`)
    return {
      exercises: processedExercises,
      total: data.metadata?.totalExercises || processedExercises.length
    }
    
  } catch (error) {
    console.error('❌ Error fetching exercises from API:', error)
    
    // Fallback mejorado con ejercicios estáticos más variados
    return getFallbackExercises(search, limit, offset, bodyPart, muscle)
  }
}

// Fallback con ejercicios estáticos más variados y completos
function getFallbackExercises(
  search?: string, 
  limit: number = 25, 
  offset: number = 0,
  bodyPart?: string,
  muscle?: string
): { exercises: ProcessedExercise[], total: number } {
  const fallbackExercises: ProcessedExercise[] = [
    // Ejercicios de Pecho
    {
      id: "chest_1",
      name: "Push-up",
      nameEs: "Flexiones",
      bodyPart: "chest",
      bodyPartEs: "Pecho",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "pectorals",
      targetEs: "Pectorales",
      instructions: ["Comienza en posición de plancha", "Baja el cuerpo manteniendo la línea recta", "Empuja hacia arriba"],
      gifUrl: "https://v2.exercisedb.io/image/chest_1"
    },
    {
      id: "chest_2",
      name: "Incline Dumbbell Press",
      nameEs: "Press Inclinado con Mancuernas",
      bodyPart: "chest",
      bodyPartEs: "Pecho",
      equipment: "dumbbell",
      equipmentEs: "Mancuernas",
      target: "pectorals",
      targetEs: "Pectorales",
      instructions: ["Acuéstate en un banco inclinado", "Presiona las mancuernas hacia arriba", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/chest_2"
    },
    
    // Ejercicios de Espalda
    {
      id: "back_1",
      name: "Pull-up",
      nameEs: "Dominadas",
      bodyPart: "back",
      bodyPartEs: "Espalda",
      equipment: "pull up bar",
      equipmentEs: "Barra de dominadas",
      target: "latissimus dorsi",
      targetEs: "Dorsal ancho",
      instructions: ["Cuelga de la barra", "Tira del cuerpo hacia arriba", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/back_1"
    },
    {
      id: "back_2",
      name: "Bent Over Row",
      nameEs: "Remo Inclinado",
      bodyPart: "back",
      bodyPartEs: "Espalda",
      equipment: "barbell",
      equipmentEs: "Barra",
      target: "latissimus dorsi",
      targetEs: "Dorsal ancho",
      instructions: ["Inclínate hacia adelante", "Rema la barra hacia tu abdomen", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/back_2"
    },
    
    // Ejercicios de Piernas
    {
      id: "legs_1",
      name: "Squat",
      nameEs: "Sentadillas",
      bodyPart: "legs",
      bodyPartEs: "Piernas",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "quadriceps",
      targetEs: "Cuádriceps",
      instructions: ["Párate con los pies separados", "Baja como si te fueras a sentar", "Regresa a la posición inicial"],
      gifUrl: "https://v2.exercisedb.io/image/legs_1"
    },
    {
      id: "legs_2",
      name: "Lunges",
      nameEs: "Zancadas",
      bodyPart: "legs",
      bodyPartEs: "Piernas",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "quadriceps",
      targetEs: "Cuádriceps",
      instructions: ["Da un paso hacia adelante", "Baja la rodilla trasera", "Regresa a la posición inicial"],
      gifUrl: "https://v2.exercisedb.io/image/legs_2"
    },
    {
      id: "legs_3",
      name: "Deadlift",
      nameEs: "Peso Muerto",
      bodyPart: "legs",
      bodyPartEs: "Piernas",
      equipment: "barbell",
      equipmentEs: "Barra",
      target: "hamstrings",
      targetEs: "Isquiotibiales",
      instructions: ["Mantén la espalda recta", "Levanta la barra extendiendo caderas", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/legs_3"
    },
    
    // Ejercicios de Hombros
    {
      id: "shoulders_1",
      name: "Shoulder Press",
      nameEs: "Press de Hombros",
      bodyPart: "shoulders",
      bodyPartEs: "Hombros",
      equipment: "dumbbell",
      equipmentEs: "Mancuernas",
      target: "deltoids",
      targetEs: "Deltoides",
      instructions: ["Presiona las mancuernas hacia arriba", "Mantén el core activado", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/shoulders_1"
    },
    {
      id: "shoulders_2",
      name: "Lateral Raise",
      nameEs: "Elevaciones Laterales",
      bodyPart: "shoulders",
      bodyPartEs: "Hombros",
      equipment: "dumbbell",
      equipmentEs: "Mancuernas",
      target: "deltoids",
      targetEs: "Deltoides",
      instructions: ["Eleva los brazos lateralmente", "Hasta la altura de los hombros", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/shoulders_2"
    },
    
    // Ejercicios de Brazos
    {
      id: "arms_1",
      name: "Bicep Curl",
      nameEs: "Curl de Bíceps",
      bodyPart: "arms",
      bodyPartEs: "Brazos",
      equipment: "dumbbell",
      equipmentEs: "Mancuernas",
      target: "biceps",
      targetEs: "Bíceps",
      instructions: ["Flexiona los codos", "Lleva las mancuernas hacia los hombros", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/arms_1"
    },
    {
      id: "arms_2",
      name: "Tricep Dips",
      nameEs: "Fondos de Tríceps",
      bodyPart: "arms",
      bodyPartEs: "Brazos",
      equipment: "bench",
      equipmentEs: "Banco",
      target: "triceps",
      targetEs: "Tríceps",
      instructions: ["Apoya las manos en el banco", "Baja el cuerpo flexionando los codos", "Empuja hacia arriba"],
      gifUrl: "https://v2.exercisedb.io/image/arms_2"
    },
    
    // Ejercicios de Core/Abdominales
    {
      id: "abs_1",
      name: "Plank",
      nameEs: "Plancha",
      bodyPart: "abs",
      bodyPartEs: "Abdominales",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "abs",
      targetEs: "Abdominales",
      instructions: ["Mantén la posición de plancha", "Cuerpo en línea recta", "Respira normalmente"],
      gifUrl: "https://v2.exercisedb.io/image/abs_1"
    },
    {
      id: "abs_2",
      name: "Crunches",
      nameEs: "Encogimientos",
      bodyPart: "abs",
      bodyPartEs: "Abdominales",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "abs",
      targetEs: "Abdominales",
      instructions: ["Acuéstate boca arriba", "Eleva el torso hacia las rodillas", "Baja controladamente"],
      gifUrl: "https://v2.exercisedb.io/image/abs_2"
    },
    
    // Ejercicios de Cardio
    {
      id: "cardio_1",
      name: "Burpees",
      nameEs: "Burpees",
      bodyPart: "cardio",
      bodyPartEs: "Cardio",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "cardiovascular",
      targetEs: "Cardiovascular",
      instructions: ["Baja a posición de flexión", "Salta hacia atrás", "Salta hacia arriba con brazos extendidos"],
      gifUrl: "https://v2.exercisedb.io/image/cardio_1"
    },
    {
      id: "cardio_2",
      name: "Jumping Jacks",
      nameEs: "Saltos de Tijera",
      bodyPart: "cardio",
      bodyPartEs: "Cardio",
      equipment: "body weight",
      equipmentEs: "Peso corporal",
      target: "cardiovascular",
      targetEs: "Cardiovascular",
      instructions: ["Salta separando piernas y brazos", "Regresa a posición inicial", "Mantén el ritmo constante"],
      gifUrl: "https://v2.exercisedb.io/image/cardio_2"
    }
  ]
  
  // Filtrado combinado: si hay bodyPart y search, primero filtrar por bodyPart, luego por search
  // Permitir hasta 100 por página
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  let filtered = fallbackExercises
  if (bodyPart && search) {
    const bodyPartLower = bodyPart.toLowerCase()
    const bodyPartTranslated = translateSearchTerm(bodyPart).toLowerCase()
    filtered = fallbackExercises.filter(exercise =>
      exercise.bodyPart.toLowerCase().includes(bodyPartLower) ||
      exercise.bodyPart.toLowerCase().includes(bodyPartTranslated) ||
      exercise.bodyPartEs.toLowerCase().includes(bodyPartLower)
    )
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(exercise =>
      exercise.name.toLowerCase().includes(searchLower) ||
      exercise.nameEs.toLowerCase().includes(searchLower) ||
      exercise.bodyPartEs.toLowerCase().includes(searchLower) ||
      exercise.equipmentEs.toLowerCase().includes(searchLower) ||
      exercise.targetEs.toLowerCase().includes(searchLower)
    )
  } else {
    // Filtrar por búsqueda si existe
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = fallbackExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchLower) ||
        exercise.nameEs.toLowerCase().includes(searchLower) ||
        exercise.bodyPartEs.toLowerCase().includes(searchLower) ||
        exercise.equipmentEs.toLowerCase().includes(searchLower) ||
        exercise.targetEs.toLowerCase().includes(searchLower)
      )
    }
    // Filtrar por parte del cuerpo si existe
    if (bodyPart) {
      const bodyPartLower = bodyPart.toLowerCase()
      const bodyPartTranslated = translateSearchTerm(bodyPart).toLowerCase()
      filtered = filtered.filter(exercise =>
        exercise.bodyPart.toLowerCase().includes(bodyPartLower) ||
        exercise.bodyPart.toLowerCase().includes(bodyPartTranslated) ||
        exercise.bodyPartEs.toLowerCase().includes(bodyPartLower)
      )
    }
    // Filtrar por músculo si existe
    if (muscle) {
      const muscleLower = muscle.toLowerCase()
      const muscleTranslated = translateSearchTerm(muscle).toLowerCase()
      filtered = filtered.filter(exercise =>
        exercise.target.toLowerCase().includes(muscleLower) ||
        exercise.target.toLowerCase().includes(muscleTranslated) ||
        exercise.targetEs.toLowerCase().includes(muscleLower)
      )
    }
  }
  // Aplicar paginación
  const start = offset
  const end = offset + safeLimit
  const paginatedExercises = filtered.slice(start, end)
  return {
    exercises: paginatedExercises,
    total: filtered.length
  }
}

// Función para obtener la lista de body parts disponibles
async function getAvailableBodyParts(): Promise<string[]> {
  try {
    const response = await fetch('https://www.exercisedb.dev/api/v1/bodyparts', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GymLog-App/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.success ? data.data : []
    }
  } catch (error) {
    console.error('Error fetching body parts:', error)
  }
  
  // Fallback con body parts conocidos
  return ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'waist', 'neck', 'cardio']
}

// Función para obtener la lista de músculos disponibles
async function getAvailableMuscles(): Promise<string[]> {
  try {
    const response = await fetch('https://www.exercisedb.dev/api/v1/muscles', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GymLog-App/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.success ? data.data : []
    }
  } catch (error) {
    console.error('Error fetching muscles:', error)
  }
  
  // Fallback con músculos conocidos
  return ['biceps', 'triceps', 'pectorals', 'lats', 'delts', 'quadriceps', 'hamstrings', 'glutes', 'abs', 'calves']
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const search = searchParams.get('search')
      const bodyPart = searchParams.get('bodyPart')
      const muscle = searchParams.get('muscle') // Nuevo parámetro para músculos específicos
      const categories = searchParams.get('categories') // Para obtener listas de categorías
      // ⚡ OPTIMIZADO: Solo cargar 25 ejercicios por defecto para evitar sobrecarga
      // El usuario debe buscar/filtrar para obtener más resultados
      const limit = parseInt(searchParams.get('limit') || '25')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Si se solicitan categorías, devolver listas de body parts y músculos
      if (categories === 'true') {
        const [bodyParts, muscles] = await Promise.all([
          getAvailableBodyParts(),
          getAvailableMuscles()
        ])
        
        return Response.json({
          success: true,
          data: {
            bodyParts: bodyParts.map(bp => ({
              value: bp,
              label: displayTranslations[bp] || bp,
              labelEs: displayTranslations[bp] || bp
            })),
            muscles: muscles.map(muscle => ({
              value: muscle,
              label: displayTranslations[muscle] || muscle,
              labelEs: displayTranslations[muscle] || muscle
            }))
          },
          message: 'Categorías obtenidas exitosamente'
        })
      }

      // Verificar cache con clave más específica
      const cacheKey = `exercises_${search || 'all'}_${bodyPart || 'all'}_${muscle || 'all'}_${limit}_${offset}`
      const cached = exerciseCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return Response.json({
          success: true,
          data: cached.data.exercises,
          total: cached.data.total,
          message: 'Ejercicios obtenidos exitosamente (cache)'
        })
      }

      // Obtener ejercicios de la API oficial de ExerciseDB
      // Si el límite es > 25, hacer múltiples llamadas para obtener todos
      let allExercises: ProcessedExercise[] = []
      let totalCount = 0
      
      if (limit > 25) {
        // 🚀 Hacer llamadas múltiples en paralelo para obtener TODOS los ejercicios
        const numCalls = Math.ceil(limit / 25)
        const calls = []
        
        console.log(`🚀 Fetching ${numCalls} pages in parallel to get ${limit} exercises...`)
        
        for (let i = 0; i < numCalls; i++) {
          const callOffset = offset + (i * 25)
          const callLimit = Math.min(25, limit - (i * 25))
          calls.push(
            fetchExercisesFromAPI(
              search || undefined, 
              bodyPart || undefined, 
              muscle || undefined,
              callLimit, 
              callOffset
            )
          )
        }
        
        // Ejecutar llamadas en lotes más pequeños con delay para evitar rate limiting
        console.log(`⚡ Executing ${calls.length} API calls in batches of 3...`)
        const results: { exercises: ProcessedExercise[], total: number }[] = []
        const batchSize = 3
        
        for (let i = 0; i < calls.length; i += batchSize) {
          const batch = calls.slice(i, i + batchSize)
          const batchResults = await Promise.all(batch)
          results.push(...batchResults)
          
          // Delay de 500ms entre lotes para evitar rate limiting
          if (i + batchSize < calls.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        // Combinar todos los resultados y eliminar duplicados por ID
        const exercisesMap = new Map<string, ProcessedExercise>()
        results.forEach(result => {
          result.exercises.forEach(exercise => {
            exercisesMap.set(exercise.id, exercise)
          })
        })
        
        allExercises = Array.from(exercisesMap.values())
        totalCount = results[0]?.total || allExercises.length
        
        console.log(`✅ Combined ${allExercises.length} unique exercises from ${results.length} API calls`)
        
      } else {
        // Para límites <= 25, una sola llamada
        const result = await fetchExercisesFromAPI(
          search || undefined, 
          bodyPart || undefined, 
          muscle || undefined,
          limit, 
          offset
        )
        allExercises = result.exercises
        totalCount = result.total
      }
      
      const result = { exercises: allExercises, total: totalCount }

      // Guardar en cache
      exerciseCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      return Response.json({
        success: true,
        data: result.exercises,
        total: result.total,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < result.total
        },
        filters: {
          search: search || null,
          bodyPart: bodyPart || null,
          muscle: muscle || null
        },
        message: result.exercises.length === 0 ? 'No se encontraron ejercicios' : `Se encontraron ${result.exercises.length} ejercicios`
      })

    } catch (error) {
      console.error('❌ Error en API de ejercicios:', error)
      return Response.json({
        success: false,
        error: 'Error interno del servidor'
      }, { status: 500 })
    }
  })
}