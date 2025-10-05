import { NextRequest } from 'next/server'
import { verifyToken, getTokenFromHeader, JWTPayload } from './jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

/**
 * Middleware para verificar autenticación JWT
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  isAuthenticated: boolean
  user?: JWTPayload
  error?: string
}> {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader || '')
    
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'Token de autorización requerido'
      }
    }
    
    const user = await verifyToken(token)
    
    if (!user) {
      return {
        isAuthenticated: false,
        error: 'Token inválido o expirado'
      }
    }
    
    return {
      isAuthenticated: true,
      user
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      error: 'Error en la autenticación'
    }
  }
}

/**
 * Respuesta estándar para errores de autenticación
 */
export function createAuthErrorResponse(error: string, status: number = 401) {
  return Response.json(
    {
      success: false,
      error,
      message: 'Acceso no autorizado'
    },
    { status }
  )
}

/**
 * Helper para endpoints que requieren autenticación
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<Response>
): Promise<Response> {
  const auth = await authenticateRequest(request)
  
  if (!auth.isAuthenticated || !auth.user) {
    return createAuthErrorResponse(auth.error || 'No autorizado')
  }
  
  return handler(request, auth.user)
}