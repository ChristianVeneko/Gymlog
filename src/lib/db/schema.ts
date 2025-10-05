import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Tabla de usuarios
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de rutinas
export const rutinas = sqliteTable('rutinas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  daysOfWeek: text('days_of_week'), // JSON string: ["lunes", "miércoles", "viernes"]
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de ejercicios (cache de ExerciseDB API)
export const ejercicios = sqliteTable('ejercicios', {
  id: text('id').primaryKey(), // ID de ExerciseDB
  name: text('name').notNull(),
  nameEs: text('name_es'), // Nombre traducido al español
  bodyPart: text('body_part'),
  equipment: text('equipment'),
  target: text('target'),
  instructions: text('instructions'), // JSON array de instrucciones
  secondaryMuscles: text('secondary_muscles'), // JSON array
  gifUrl: text('gif_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de relación rutina-ejercicios
export const rutinaEjercicios = sqliteTable('rutina_ejercicios', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rutinaId: text('rutina_id').notNull().references(() => rutinas.id, { onDelete: 'cascade' }),
  ejercicioId: text('ejercicio_id').notNull(), // ID del ejercicio de la API externa
  ejercicioName: text('ejercicio_name').notNull(), // Nombre del ejercicio para referencia
  ejercicioNameEs: text('ejercicio_name_es'), // Nombre en español
  bodyPart: text('body_part'), // Parte del cuerpo
  equipment: text('equipment'), // Equipamiento
  target: text('target'), // Músculo objetivo
  gifUrl: text('gif_url'), // URL del GIF
  dayOfWeek: text('day_of_week').notNull(), // Día de la semana (Lunes, Martes, etc.)
  sets: integer('sets'), // Sets sugeridos (opcional para plantilla)
  reps: text('reps'), // Reps sugeridos (opcional para plantilla)
  weight: real('weight'), // Peso sugerido inicial (opcional)
  restTime: integer('rest_time'), // Tiempo de descanso sugerido (opcional)
  order: integer('order').notNull(), // Orden en el día
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de entrenamientos (sesiones)
export const entrenamientos = sqliteTable('entrenamientos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rutinaId: text('rutina_id').notNull().references(() => rutinas.id),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  startTime: text('start_time'), // HH:MM
  endTime: text('end_time'), // HH:MM
  duration: integer('duration'), // Duración en minutos
  notes: text('notes'),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de sets (registro de cada serie)
export const sets = sqliteTable('sets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entrenamientoId: text('entrenamiento_id').notNull().references(() => entrenamientos.id, { onDelete: 'cascade' }),
  ejercicioId: text('ejercicio_id').notNull(), // Sin foreign key - permite ejercicios no guardados en tabla ejercicios
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weight: real('weight'),
  duration: integer('duration'), // Para ejercicios de tiempo (plancha, etc.)
  completed: integer('completed', { mode: 'boolean' }).default(false),
  restTime: integer('rest_time'), // Tiempo de descanso real tomado
  rpe: integer('rpe'), // Rate of Perceived Exertion (1-10)
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de métricas del usuario
export const userMetrics = sqliteTable('user_metrics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  weight: real('weight'), // Peso corporal
  bodyFat: real('body_fat'), // % grasa corporal
  muscleMass: real('muscle_mass'), // kg masa muscular
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de objetivos del usuario
export const userGoals = sqliteTable('user_goals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'weight_loss', 'muscle_gain', 'strength', 'endurance'
  targetValue: real('target_value'),
  currentValue: real('current_value'),
  targetDate: text('target_date'), // YYYY-MM-DD
  achieved: integer('achieved', { mode: 'boolean' }).default(false),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de personal records
export const personalRecords = sqliteTable('personal_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ejercicioId: text('ejercicio_id').notNull().references(() => ejercicios.id),
  type: text('type').notNull(), // '1rm', 'max_reps', 'max_weight', 'max_time'
  value: real('value').notNull(),
  reps: integer('reps'), // Para 1RM calculation
  fecha: text('fecha').notNull(),
  entrenamientoId: text('entrenamiento_id').references(() => entrenamientos.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabla de recomendaciones de IA
export const aiRecommendations = sqliteTable('ai_recommendations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'routine', 'weight_adjustment', 'rest_day', 'nutrition'
  title: text('title').notNull(),
  description: text('description').notNull(),
  recommendation: text('recommendation').notNull(), // JSON con los datos de la recomendación
  priority: text('priority').default('medium'), // 'low', 'medium', 'high'
  status: text('status').default('active'), // 'active', 'applied', 'dismissed'
  validUntil: text('valid_until'), // YYYY-MM-DD
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tipos TypeScript inferidos
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Rutina = typeof rutinas.$inferSelect;
export type NewRutina = typeof rutinas.$inferInsert;

export type Ejercicio = typeof ejercicios.$inferSelect;
export type NewEjercicio = typeof ejercicios.$inferInsert;

export type RutinaEjercicio = typeof rutinaEjercicios.$inferSelect;
export type NewRutinaEjercicio = typeof rutinaEjercicios.$inferInsert;

export type Entrenamiento = typeof entrenamientos.$inferSelect;
export type NewEntrenamiento = typeof entrenamientos.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type UserMetric = typeof userMetrics.$inferSelect;
export type NewUserMetric = typeof userMetrics.$inferInsert;

export type UserGoal = typeof userGoals.$inferSelect;
export type NewUserGoal = typeof userGoals.$inferInsert;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;

export type AIRecommendation = typeof aiRecommendations.$inferSelect;
export type NewAIRecommendation = typeof aiRecommendations.$inferInsert;