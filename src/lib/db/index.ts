import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Configuración exclusiva para Turso
console.log('🔗 Conectando a Turso...');

if (!process.env.DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
  throw new Error('❌ Variables de entorno DATABASE_URL y DATABASE_AUTH_TOKEN son requeridas');
}

const client: Client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

// Crear instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Exportar cliente para uso directo si es necesario
export { client };

// Función para probar la conexión
export async function testConnection() {
  try {
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a base de datos:', error);
    return false;
  }
}

// Función para inicializar tablas
export async function initializeTables() {
  try {
    console.log('📋 Inicializando tablas...');
    
    // Crear tabla users
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla ejercicios
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ejercicios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_es TEXT,
        body_part TEXT,
        equipment TEXT,
        target TEXT,
        instructions TEXT,
        secondary_muscles TEXT,
        gif_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla rutinas
    await client.execute(`
      CREATE TABLE IF NOT EXISTS rutinas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        days_of_week TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tablas inicializadas correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando tablas:', error);
    return false;
  }
}