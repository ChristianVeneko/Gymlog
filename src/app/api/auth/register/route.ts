import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword, validatePassword, validateEmail } from '@/lib/auth/password'
import { createToken, createRefreshToken } from '@/lib/auth/jwt'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validaciones básicas
    if (!name || !email || !password) {
      return Response.json(
        {
          success: false,
          error: 'Nombre, email y contraseña son requeridos'
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

    // Validar fortaleza de contraseña
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return Response.json(
        {
          success: false,
          error: 'Contraseña no cumple los requisitos',
          details: passwordValidation.errors
        },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'El email ya está registrado'
        },
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

    return Response.json(
      {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error en registro:', error)
    return Response.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo completar el registro'
      },
      { status: 500 }
    )
  }
}