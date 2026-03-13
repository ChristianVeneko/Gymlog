/**
 * Utilidades para manejo de fechas y zona horaria
 * Turso usa UTC, pero necesitamos trabajar con la zona horaria local del usuario
 */

/**
 * Detecta la zona horaria del navegador del usuario.
 * En el servidor (Node.js) retorna UTC como fallback seguro.
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en la zona horaria local
 * @param timeZone - Zona horaria (default: detectada del navegador)
 */
export function getLocalDate(timeZone?: string): string {
  const tz = timeZone || getBrowserTimezone()
  const now = new Date()
  
  // Convertir a la zona horaria local
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Obtiene el día de la semana en español basado en la zona horaria local
 * @param timeZone - Zona horaria (default: detectada del navegador)
 */
export function getLocalDayOfWeek(timeZone?: string): string {
  const tz = timeZone || getBrowserTimezone()
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const now = new Date()
  
  // Convertir a la zona horaria local
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  
  return diasSemana[localDate.getDay()]
}

/**
 * Obtiene la hora actual en formato HH:MM en la zona horaria local
 * @param timeZone - Zona horaria (default: detectada del navegador)
 */
export function getLocalTime(timeZone?: string): string {
  const tz = timeZone || getBrowserTimezone()
  const now = new Date()
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  
  const hours = String(localDate.getHours()).padStart(2, '0')
  const minutes = String(localDate.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

/**
 * Convierte una fecha ISO a la zona horaria local
 * @param timeZone - Zona horaria (default: detectada del navegador)
 */
export function toLocalDate(isoDate: string, timeZone?: string): Date {
  const tz = timeZone || getBrowserTimezone()
  const date = new Date(isoDate)
  return new Date(date.toLocaleString('en-US', { timeZone: tz }))
}

/**
 * Formatea una fecha YYYY-MM-DD sin conversión de zona horaria
 * Esto evita que JavaScript interprete la fecha como UTC y la convierta
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @param locale - Locale para formatear (default: 'es-ES')
 */
export function formatDateString(dateString: string, locale: string = 'es-ES'): string {
  // Parsear manualmente para evitar conversión UTC
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month - 1 porque JavaScript usa 0-11
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
