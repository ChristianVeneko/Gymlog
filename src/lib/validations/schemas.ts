import { z } from 'zod'

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
})

export const registerSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  email: z.string().email('Formato de email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/\d/, 'Debe contener al menos un número')
})

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional().nullable()
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido')
})

// ============================================================
// Rutina Schemas
// ============================================================

export const rutinaEjercicioSchema = z.object({
  ejercicioId: z.string().min(1),
  ejercicioName: z.string().min(1),
  ejercicioNameEs: z.string().optional(),
  bodyPart: z.string().optional().default(''),
  equipment: z.string().optional().default(''),
  target: z.string().optional().default(''),
  gifUrl: z.string().optional().default(''),
  dayOfWeek: z.string().min(1),
  sets: z.number().int().min(1).optional(),
  reps: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  restTime: z.number().int().nullable().optional(),
  notes: z.string().optional().default(''),
  order: z.number().int().min(1)
})

export const createRutinaSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(50),
  description: z.string().max(200).optional().default(''),
  daysOfWeek: z.array(z.string()).optional(),
  ejercicios: z.array(rutinaEjercicioSchema).min(1, 'Al menos un ejercicio'),
  isActive: z.boolean().optional().default(true)
})

export const updateRutinaSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(200).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  ejercicios: z.array(rutinaEjercicioSchema).optional(),
  isActive: z.boolean().optional()
})

// ============================================================
// Entrenamiento Schemas
// ============================================================

export const createEntrenamientoSchema = z.object({
  rutinaId: z.string().min(1, 'Rutina ID requerido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  notes: z.string().optional().default(''),
  sets: z.array(z.object({
    ejercicioId: z.string().min(1),
    setNumber: z.number().int().min(1),
    reps: z.number().int().nullable().optional(),
    weight: z.number().nullable().optional(),
    duration: z.number().int().nullable().optional(),
    completed: z.boolean(),
    restTime: z.number().int().nullable().optional(),
    rpe: z.number().int().min(1).max(10).nullable().optional(),
    notes: z.string().optional().default('')
  })).optional()
})

export const updateEntrenamientoSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  endTime: z.string().optional(),
  duration: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional()
})

export const patchEntrenamientoSchema = z.object({
  completed: z.boolean().optional(),
  endTime: z.string().optional(),
  duration: z.number().int().min(1).optional(),
  notes: z.string().optional()
})

export const syncSetsSchema = z.object({
  sets: z.array(z.object({
    ejercicioId: z.string().min(1),
    setNumber: z.number().int().min(1),
    weight: z.number().nullable().optional(),
    reps: z.number().int().nullable().optional(),
    completed: z.boolean().default(false),
    fallo: z.boolean().default(false),
    notes: z.string().optional()
  }))
})

// ============================================================
// Stats & IA Schemas
// ============================================================

export const iaAnalysisSchema = z.object({
  type: z.enum(['routine_review', 'progress_analysis', 'workout_suggestions', 'form_feedback', 'general', 'rutina', 'recovery']),
  data: z.record(z.string(), z.unknown()).optional()
})

// ============================================================
// Type exports (inferred from Zod)
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type RutinaEjercicioInput = z.infer<typeof rutinaEjercicioSchema>
export type CreateRutinaInput = z.infer<typeof createRutinaSchema>
export type UpdateRutinaInput = z.infer<typeof updateRutinaSchema>
export type CreateEntrenamientoInput = z.infer<typeof createEntrenamientoSchema>
export type UpdateEntrenamientoInput = z.infer<typeof updateEntrenamientoSchema>
export type PatchEntrenamientoInput = z.infer<typeof patchEntrenamientoSchema>
export type SyncSetsInput = z.infer<typeof syncSetsSchema>
export type IAAnalysisInput = z.infer<typeof iaAnalysisSchema>

// ============================================================
// API Response types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface WorkoutStats {
  totalSets: number
  completedSets: number
  totalVolume: number
  avgRPE: number | null
  exerciseCount: number
}
