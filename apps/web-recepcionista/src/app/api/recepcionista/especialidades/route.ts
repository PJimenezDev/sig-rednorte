import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@sig-rednorte/database';

// Configuración de CORS para permitir solicitudes desde el frontend
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Crear un cliente de Supabase con el token del usuario
  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Obtener la lista de especialidades desde la base de datos
  const { data: especialidades } = await supabase
    .from('especialidades')
    .select('id, nombre')
    .order('nombre');

    // Retornar la lista de especialidades en la respuesta
  return NextResponse.json({ especialidades: especialidades ?? [] });
}

// Función para manejar las solicitudes OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3010',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
