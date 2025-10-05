import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GymLog - Tu Compañero de Entrenamiento',
  description: 'Aplicación de seguimiento de entrenamientos de gimnasio con IA para recomendaciones personalizadas',
  keywords: ['fitness', 'gym', 'workout', 'training', 'ai', 'rutinas'],
  authors: [{ name: 'Christian Veneko' }],
  openGraph: {
    title: 'GymLog - Tu Compañero de Entrenamiento',
    description: 'Aplicación de seguimiento de entrenamientos de gimnasio con IA',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GymLog',
    description: 'Tu compañero de entrenamiento con IA',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <div id="root" className="min-h-full">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}