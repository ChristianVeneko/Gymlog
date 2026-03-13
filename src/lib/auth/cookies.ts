import { cookies } from 'next/headers'

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'gymlog_access_token'
export const REFRESH_TOKEN_COOKIE = 'gymlog_refresh_token'

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Cookie options for access token (7 days)
 */
function getAccessTokenOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
  }
}

/**
 * Cookie options for refresh token (30 days)
 */
function getRefreshTokenOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
  }
}

/**
 * Set auth tokens as HttpOnly cookies on a Response
 */
export function setAuthCookies(response: Response, accessToken: string, refreshToken: string): Response {
  const accessOpts = getAccessTokenOptions()
  const refreshOpts = getRefreshTokenOptions()

  // Build Set-Cookie headers manually since Response doesn't have cookie helpers
  const accessCookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; HttpOnly; Path=${accessOpts.path}; Max-Age=${accessOpts.maxAge}; SameSite=${accessOpts.sameSite}${accessOpts.secure ? '; Secure' : ''}`
  const refreshCookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; HttpOnly; Path=${refreshOpts.path}; Max-Age=${refreshOpts.maxAge}; SameSite=${refreshOpts.sameSite}${refreshOpts.secure ? '; Secure' : ''}`

  // Clone response headers and append cookies
  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', accessCookie)
  headers.append('Set-Cookie', refreshCookie)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Clear auth cookies (for logout)
 */
export function clearAuthCookies(response: Response): Response {
  const clearAccess = `${ACCESS_TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`
  const clearRefresh = `${REFRESH_TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`

  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', clearAccess)
  headers.append('Set-Cookie', clearRefresh)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Get access token from request cookies
 */
export function getAccessTokenFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null

  const cookies = parseCookies(cookieHeader)
  return cookies[ACCESS_TOKEN_COOKIE] || null
}

/**
 * Get refresh token from request cookies  
 */
export function getRefreshTokenFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null

  const cookies = parseCookies(cookieHeader)
  return cookies[REFRESH_TOKEN_COOKIE] || null
}

/**
 * Parse Cookie header string into key-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name.trim()] = rest.join('=').trim()
    }
  })
  return cookies
}
