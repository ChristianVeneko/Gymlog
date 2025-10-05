import { NextRequest } from 'next/server'
import { verifyToken, createToken, createRefreshToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return Response.json(
        {
          success: false,
          error: 'Refresh token requerido'
        },
        { status: 400 }
      )
    }

    // Verificar el refresh token
    const payload = await verifyToken(refreshToken)
    
    if (!payload) {
      return Response.json(
        {
          success: false,
          error: 'Refresh token inválido o expirado'
        },
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
        {
          success: false,
          error: 'Usuario no encontrado'
        },
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

    return Response.json(
      {
        success: true,
        message: 'Tokens renovados exitosamente',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error renovando tokens:', error)
    return Response.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}