import { NextRequest } from 'next/server'
import { verifyToken, createToken, createRefreshToken } from '@/lib/auth/jwt'
import { getRefreshTokenFromCookies, setAuthCookies } from '@/lib/auth/cookies'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(request, 'refresh')
    if (!rateLimitResult.allowed) {
      return Response.json(
        { success: false, error: `Demasiados intentos. Intenta de nuevo en ${rateLimitResult.retryAfter} segundos.` },
        { status: 429 }
      )
    }

    // Leer refresh token de la cookie HttpOnly
    const refreshTokenValue = getRefreshTokenFromCookies(request)

    if (!refreshTokenValue) {
      return Response.json(
        { success: false, error: 'Refresh token no encontrado' },
        { status: 400 }
      )
    }

    // Verificar el refresh token
    const payload = await verifyToken(refreshTokenValue)
    
    if (!payload) {
      return Response.json(
        { success: false, error: 'Refresh token inválido o expirado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario aún existe
    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (userResult.length === 0) {
      return Response.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const user = userResult[0]

    // Crear nuevos tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    }

    const newAccessToken = await createToken(tokenPayload)
    const newRefreshToken = await createRefreshToken(tokenPayload)

    // Respuesta sin tokens en el body
    const jsonResponse = Response.json(
      {
        success: true,
        message: 'Tokens renovados exitosamente'
      },
      { status: 200 }
    )

    // Setear nuevos tokens como HttpOnly cookies
    return setAuthCookies(jsonResponse, newAccessToken, newRefreshToken)

  } catch (error) {
    console.error('Error renovando tokens:', error)
    return Response.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}