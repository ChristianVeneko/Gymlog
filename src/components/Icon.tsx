import Image from 'next/image'

interface IconProps {
  name: string
  size?: number
  className?: string
  alt?: string
}

/**
 * Reusable icon component that renders SVGs from /icons/ folder.
 * Uses next/image for optimization.
 * 
 * Usage: <Icon name="biceps" size={24} className="text-blue-500" />
 * 
 * Available icons: all-body-parts, ai-brain, back-part, biceps, cardio, 
 * chest-armor, clock, double-gym-dumbbell, edit, fire, flask, gym, hourglass,
 * logo, lowe-leg, lower-arm, neck-part, not-found, notepad, 
 * progress-report, quadriceps, shoulders, sparkle, summary-kpi, 
 * target, waist, weightlifting, workout-list
 */
export default function Icon({ name, size = 24, className = '', alt }: IconProps) {
  // Map short names to actual filenames
  const fileMap: Record<string, string> = {
    'biceps': 'biceps-svgrepo-com',
    'back': 'back-part-svgrepo-com',
    'chest': 'chest-armor-svgrepo-com',
    'shoulders': 'shoulders-svgrepo-com',
    'neck': 'neck-part-svgrepo-com',
    'waist': 'waist-svgrepo-com',
    'upper-legs': 'quadriceps',
    'lower-legs': 'lowe-leg',
    'lower-arms': 'lower-arm',
    'dumbbell': 'double-gym-dumbbell-svgrepo-com',
    'gym': 'gym-svgrepo-com',
    'weightlifting': 'weightlifting-svgrepo-com',
    'notepad': 'notepad-svgrepo-com',
    'progress': 'progress-report-svgrepo-com',
    'summary': 'summary-kpi-svgrepo-com',
    'workout-list': 'workout-list-svgrepo-com',
    'all-body-parts': 'all-body-parts',
    'cardio': 'cardio',
    'logo': 'logo',
    'fire': 'fire',
    'target': 'target',
    'clock': 'clock',
    'hourglass': 'hourglass',
    'ai-brain': 'ai-brain',
    'sparkle': 'sparkle',
    'flask': 'flask',
    'edit': 'edit',
    'not-found': 'not-found',
  }

  const filename = fileMap[name] || name

  return (
    <Image
      src={`/icons/${filename}.svg`}
      alt={alt || name}
      width={size}
      height={size}
      className={className}
    />
  )
}
