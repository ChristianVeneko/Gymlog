import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyPassword, validateEmail } from '@/lib/auth/password'
import { createToken, createRefreshToken } from '@/lib/auth/jwt'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validaciones básicas
    if (!email || !password) {
      return Response.json(
        {
          success: false,
          error: 'Email y contraseña son requeridos'
        },
        { status: 400 }
      )
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return Response.json(
        {
          success: false,
          error: 'Formato de email inválido'
        },
        { status: 400 }
      )
    }

    // Buscar el usuario
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1)

    if (userResult.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'Credenciales inválidas'
        },
        { status: 401 }
      )
    }

    const user = userResult[0]

    // Verificar la contraseña
    const isPasswordValid = await verifyPassword(password, user.password)
    
    if (!isPasswordValid) {
      return Response.json(
        {
          success: false,
          error: 'Credenciales inválidas'
        },
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

    return Response.json(
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
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error en login:', error)
    return Response.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo completar el inicio de sesión'
      },
      { status: 500 }
    )
  }
}