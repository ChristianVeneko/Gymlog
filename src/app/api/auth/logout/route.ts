import { clearAuthCookies } from '@/lib/auth/cookies'

export async function POST() {
  const jsonResponse = Response.json(
    { success: true, message: 'Sesión cerrada exitosamente' },
    { status: 200 }
  )

  return clearAuthCookies(jsonResponse)
}
