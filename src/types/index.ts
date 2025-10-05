// Tipos de autenticación
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Tipos de ejercicios
export interface ExerciseSearchParams {
  query?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  limit?: number;
  offset?: number;
}

export interface ExerciseDBResponse {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

// Tipos de rutinas
export interface RutinaDetalle {
  id: string;
  name: string;
  description?: string;
  daysOfWeek: string[];
  isActive: boolean;
  ejercicios: RutinaEjercicioDetalle[];
  createdAt: string;
}

export interface RutinaEjercicioDetalle {
  id: string;
  ejercicio: {
    id: string;
    name: string;
    nameEs?: string;
    bodyPart: string;
    equipment: string;
    gifUrl: string;
  };
  sets: number;
  reps: string;
  weight?: number;
  restTime?: number;
  order: number;
  notes?: string;
}

// Tipos de entrenamientos
export interface EntrenamientoSession {
  id: string;
  rutina: {
    id: string;
    name: string;
  };
  fecha: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  completed: boolean;
  ejercicios: EntrenamientoEjercicio[];
  notes?: string;
}

export interface EntrenamientoEjercicio {
  ejercicioId: string;
  ejercicio: {
    name: string;
    nameEs?: string;
    gifUrl: string;
    bodyPart: string;
  };
  sets: EntrenamientoSet[];
  completed: boolean;
}

export interface EntrenamientoSet {
  id?: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number; // Para ejercicios por tiempo
  completed: boolean;
  restTime?: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
  notes?: string;
}

// Tipos de progreso y estadísticas
export interface ProgressStats {
  totalWorkouts: number;
  totalVolume: number; // Total weight lifted
  averageWorkoutDuration: number;
  workoutStreak: number;
  currentWeekWorkouts: number;
  personalRecords: PersonalRecordSummary[];
  monthlyProgress: MonthlyProgress[];
}

export interface PersonalRecordSummary {
  ejercicioId: string;
  ejercicioName: string;
  type: 'max_weight' | '1rm' | 'max_reps' | 'max_time';
  value: number;
  fecha: string;
  improvement?: number; // % improvement from previous PR
}

export interface MonthlyProgress {
  month: string; // YYYY-MM
  workouts: number;
  totalVolume: number;
  averageDuration: number;
}

export interface ExerciseProgress {
  ejercicioId: string;
  ejercicioName: string;
  sessions: ExerciseProgressSession[];
  trend: 'improving' | 'plateaued' | 'declining';
  oneRepMax: number;
  volumeTrend: number[];
}

export interface ExerciseProgressSession {
  fecha: string;
  maxWeight: number;
  totalVolume: number;
  bestSet: {
    weight: number;
    reps: number;
  };
}

// Tipos de IA y recomendaciones
export interface AIAnalysisRequest {
  userId: string;
  timeframe: 'week' | 'month' | 'quarter';
  includeProgress?: boolean;
  includeGoals?: boolean;
}

export interface AIRecommendationResponse {
  type: 'routine' | 'weight_adjustment' | 'rest_day' | 'nutrition' | 'general';
  title: string;
  description: string;
  recommendation: any; // JSON específico según el tipo
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  reasoning: string;
}

export interface AIRoutineRecommendation {
  name: string;
  description: string;
  daysPerWeek: number;
  ejercicios: {
    ejercicioId: string;
    sets: number;
    reps: string;
    restTime: number;
    notes?: string;
  }[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIWeightAdjustment {
  ejercicioId: string;
  currentWeight: number;
  recommendedWeight: number;
  adjustmentReason: string;
  progressionType: 'linear' | 'double_progression' | 'wave_loading';
}

// Tipos de métricas del usuario
export interface UserMetricEntry {
  fecha: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  notes?: string;
}

export interface UserGoalEntry {
  id: string;
  type: 'weight_loss' | 'muscle_gain' | 'strength' | 'endurance';
  targetValue: number;
  currentValue: number;
  targetDate: string;
  achieved: boolean;
  description: string;
  progress: number; // 0-100%
}

// Tipos de respuesta de API
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Tipos de configuración
export interface AppConfig {
  exercisedb: {
    apiUrl: string;
    cacheExpiry: number; // minutes
  };
  ai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  auth: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
}

// Tipos de filtros y ordenamiento
export interface FilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  bodyParts?: string[];
  equipment?: string[];
  completed?: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Tipos de estado de formularios
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isLoading: boolean;
  isValid: boolean;
}

// Tipos de notificaciones
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}