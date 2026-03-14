import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { currentPassword, newPassword } = body

      if (!currentPassword || !newPassword) {
        return Response.json(
          { success: false, error: 'Ambas contraseñas son requeridas' },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return Response.json(
          { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }

      // Get current user with password
      const userRecord = await db
        .select({ id: users.id, password: users.password })
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1)

      if (userRecord.length === 0) {
        return Response.json(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        )
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userRecord[0].password)
      if (!isValid) {
        return Response.json(
          { success: false, error: 'Contraseña actual incorrecta' },
          { status: 401 }
        )
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.userId))

      return Response.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      })

    } catch (error) {
      console.error('Error changing password:', error)
      return Response.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
