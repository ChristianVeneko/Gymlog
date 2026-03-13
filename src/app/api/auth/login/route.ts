import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { createToken, createRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { loginSchema } from '@/lib/validations/schemas'
import { eq } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(request, 'login')
    if (!rateLimitResult.allowed) {
      return Response.json(
        { success: false, error: `Demasiados intentos. Intenta de nuevo en ${rateLimitResult.retryAfter} segundos.` },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validar con Zod
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // Buscar el usuario
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1)

    if (userResult.length === 0) {
      return Response.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const user = userResult[0]

    // Verificar la contraseña
    const isPasswordValid = await verifyPassword(password, user.password)
    
    if (!isPasswordValid) {
      return Response.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Crear tokens JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    }

    const accessToken = await createToken(tokenPayload)
    const refreshToken = await createRefreshToken(tokenPayload)

    // Crear respuesta con datos del usuario (sin tokens en el body)
    const jsonResponse = Response.json(
      {
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.createdAt
          }
        }
      },
      { status: 200 }
    )

    // Setear tokens como HttpOnly cookies
    return setAuthCookies(jsonResponse, accessToken, refreshToken)

  } catch (error) {
    console.error('Error en login:', error)
    return Response.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}