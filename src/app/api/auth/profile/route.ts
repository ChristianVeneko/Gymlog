import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Obtener información actualizada del usuario
      const userResult = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.id, user.userId))
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

      return Response.json(
        {
          success: true,
          data: {
            user: userResult[0]
          }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error obteniendo perfil:', error)
      return Response.json(
        {
          success: false,
          error: 'Error interno del servidor'
        },
        { status: 500 }
      )
    }
  })
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { name, avatar } = body

      // Validaciones básicas
      if (name && (typeof name !== 'string' || name.trim().length === 0)) {
        return Response.json(
          {
            success: false,
            error: 'Nombre inválido'
          },
          { status: 400 }
        )
      }

      // Preparar datos para actualizar
      const updateData: { name?: string; avatar?: string; updatedAt: string } = {
        updatedAt: new Date().toISOString()
      }

      if (name) updateData.name = name.trim()
      if (avatar !== undefined) updateData.avatar = avatar

      // Actualizar usuario
      const updatedUser = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          updatedAt: users.updatedAt
        })

      return Response.json(
        {
          success: true,
          message: 'Perfil actualizado exitosamente',
          data: {
            user: updatedUser[0]
          }
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('Error actualizando perfil:', error)
      return Response.json(
        {
          success: false,
          error: 'Error interno del servidor'
        },
        { status: 500 }
      )
    }
  })
}