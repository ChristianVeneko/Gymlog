import { NextRequest, NextResponse } from 'next/server';
import { testConnection, initializeTables } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Iniciando test de API de base de datos...');

    // Probar conexión
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'No se pudo conectar a la base de datos' },
        { status: 500 }
      );
    }

    // Inicializar tablas
    const tablesInitialized = await initializeTables();
    if (!tablesInitialized) {
      return NextResponse.json(
        { error: 'No se pudieron inicializar las tablas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos funcionando correctamente',
      timestamp: new Date().toISOString(),
      database: process.env.NODE_ENV === 'development' ? 'SQLite Local' : 'Turso',
    });

  } catch (error) {
    console.error('❌ Error en test de BD:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}