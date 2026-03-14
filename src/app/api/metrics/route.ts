import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { userMetrics } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const limit = parseInt(searchParams.get('limit') || '30')

      const metrics = await db
        .select()
        .from(userMetrics)
        .where(eq(userMetrics.userId, user.userId))
        .orderBy(desc(userMetrics.fecha))
        .limit(limit)

      return Response.json({ success: true, data: metrics })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      return Response.json({ success: false, error: 'Error interno' }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { fecha, weight, bodyFat, muscleMass, notes } = body

      if (!fecha) {
        return Response.json({ success: false, error: 'Fecha es requerida' }, { status: 400 })
      }

      // Verificar si ya existe un registro para esta fecha
      const existing = await db
        .select()
        .from(userMetrics)
        .where(and(
          eq(userMetrics.userId, user.userId),
          eq(userMetrics.fecha, fecha)
        ))
        .limit(1)

      if (existing.length > 0) {
        // Actualizar existente
        await db
          .update(userMetrics)
          .set({
            weight: weight || null,
            bodyFat: bodyFat || null,
            muscleMass: muscleMass || null,
            notes: notes || null
          })
          .where(eq(userMetrics.id, existing[0].id))

        return Response.json({ success: true, message: 'Métrica actualizada' })
      }

      // Crear nueva
      await db.insert(userMetrics).values({
        userId: user.userId,
        fecha,
        weight: weight || null,
        bodyFat: bodyFat || null,
        muscleMass: muscleMass || null,
        notes: notes || null
      })

      return Response.json({ success: true, message: 'Métrica registrada' }, { status: 201 })
    } catch (error) {
      console.error('Error saving metric:', error)
      return Response.json({ success: false, error: 'Error interno' }, { status: 500 })
    }
  })
}
