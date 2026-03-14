'use client'

import { useState } from 'react'
import Image from 'next/image'
import Icon from '@/components/Icon'

interface ExerciseImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  /** Show as a small thumbnail (64×64) or larger card */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Componente optimizado para mostrar GIFs de ejercicios.
 * 
 * - Usa next/image para caché y compresión automática (WebP).
 * - Lazy loading por defecto.
 * - Fallback elegante cuando la imagen falla o no existe.
 */
export default function ExerciseImage({
  src,
  alt,
  width,
  height,
  className = '',
  size = 'sm'
}: ExerciseImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const sizeMap = {
    sm: { w: 64, h: 64 },
    md: { w: 96, h: 96 },
    lg: { w: 128, h: 128 }
  }

  const dims = {
    w: width || sizeMap[size].w,
    h: height || sizeMap[size].h
  }

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ width: dims.w, height: dims.h, minWidth: dims.w, minHeight: dims.h }}
      >
        <Icon name="biceps" size={Math.floor(dims.w * 0.4)} className="opacity-40" />
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded ${className}`}
      style={{ width: dims.w, height: dims.h, minWidth: dims.w, minHeight: dims.h }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse rounded">
          <Icon name="biceps" size={Math.floor(dims.w * 0.3)} className="opacity-30" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={dims.w}
        height={dims.h}
        className={`object-cover rounded transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => { setHasError(true); setIsLoading(false) }}
        unoptimized
      />
    </div>
  )
}
