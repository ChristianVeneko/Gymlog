import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Obtener todos los usuarios
    const users = await client.execute('SELECT id, email, name, created_at FROM users');
    
    return NextResponse.json({
      success: true,
      data: users.rows,
      count: users.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error obteniendo usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password y name son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await client.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409 }
      );
    }

    // Crear nuevo usuario
    const userId = crypto.randomUUID();
    await client.execute({
      sql: 'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
      args: [userId, email, password, name]
    });

    // Obtener el usuario creado (sin password)
    const newUser = await client.execute(
      'SELECT id, email, name, created_at FROM users WHERE id = ?',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error creando usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const result = await client.execute(
      'DELETE FROM users WHERE email = ?',
      [email]
    );

    return NextResponse.json({
      success: true,
      message: `Usuario eliminado`,
      rowsAffected: result.rowsAffected
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error eliminando usuario' },
      { status: 500 }
    );
  }
}