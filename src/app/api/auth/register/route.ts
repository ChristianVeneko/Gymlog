import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { createToken, createRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { registerSchema } from '@/lib/validations/schemas'
import { eq } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(request, 'register')
    if (!rateLimitResult.allowed) {
      return Response.json(
        { success: false, error: `Demasiados intentos. Intenta de nuevo en ${rateLimitResult.retryAfter} segundos.` },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validar con Zod (incluye validación de contraseña: 8+ chars, mayúscula, minúscula, número)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: 'Datos de registro inválidos',
          details: parsed.error.issues.map(i => i.message)
        },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    // Verificar si el usuario ya existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1)

    if (existingUser.length > 0) {
      return Response.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 409 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password)

    // Crear el usuario
    const newUser = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt
      })

    const user = newUser[0]

    // Crear tokens JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    }

    const accessToken = await createToken(tokenPayload)
    const refreshToken = await createRefreshToken(tokenPayload)

    // Crear respuesta (sin tokens en el body)
    const jsonResponse = Response.json(
      {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
          }
        }
      },
      { status: 201 }
    )

    // Setear tokens como HttpOnly cookies
    return setAuthCookies(jsonResponse, accessToken, refreshToken)

  } catch (error) {
    console.error('Error en registro:', error)
    return Response.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}