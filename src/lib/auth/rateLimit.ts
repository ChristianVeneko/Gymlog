import { NextRequest } from 'next/server'

/**
 * Simple in-memory rate limiter for serverless auth endpoints.
 * Uses a Map with IP + endpoint as key, tracking request timestamps.
 * 
 * Note: In a multi-instance deployment (e.g. Vercel), each instance
 * has its own store. For stricter limits, use Redis or Upstash.
 */

interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store (per-instance)
const store = new Map<string, RateLimitEntry>()

// Rate limit configs per endpoint type
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  login:    { maxRequests: 5,  windowMs: 60 * 1000 },     // 5 attempts per minute
  register: { maxRequests: 3,  windowMs: 5 * 60 * 1000 }, // 3 registrations per 5 minutes
  refresh:  { maxRequests: 10, windowMs: 60 * 1000 },      // 10 refreshes per minute
}

/**
 * Check if a request is within rate limits.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }
 */
export function checkRateLimit(
  request: NextRequest,
  endpoint: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const config = RATE_LIMITS[endpoint]
  if (!config) return { allowed: true }

  // Get client IP (Vercel provides x-forwarded-for, fallback to x-real-ip)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  const key = `${ip}:${endpoint}`
  const now = Date.now()

  // Get or create entry
  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs)

  // Check limit
  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000)
    return { allowed: false, retryAfter: Math.max(1, retryAfter) }
  }

  // Record this request
  entry.timestamps.push(now)

  return { allowed: true }
}

// Cleanup stale entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  const maxWindowMs = 5 * 60 * 1000 // Max window across all configs

  const entries = Array.from(store.entries())
  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i]
    entry.timestamps = entry.timestamps.filter((t: number) => now - t < maxWindowMs)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)
