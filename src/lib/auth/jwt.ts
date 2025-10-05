import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const key = new TextEncoder().encode(secretKey)

export interface JWTPayload {
  userId: string
  email: string
  name: string
  iat?: number
  exp?: number
}

/**
 * Crea un token JWT con la información del usuario
 */
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token válido por 7 días
    .sign(key)
}

/**
 * Verifica y decodifica un token JWT
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    
    // Verificar que el payload contiene los campos requeridos
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string'
    ) {
      return payload as unknown as JWTPayload
    }
    
    return null
  } catch (error) {
    console.error('Error verificando token JWT:', error)
    return null
  }
}

/**
 * Extrae el token de los headers de autorización
 */
export function getTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]
  }
  
  return null
}

/**
 * Crea un refresh token (válido por más tiempo)
 */
export async function createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Refresh token válido por 30 días
    .sign(key)
}