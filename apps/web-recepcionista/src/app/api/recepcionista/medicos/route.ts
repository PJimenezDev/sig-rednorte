import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Configuración de CORS para permitir solicitudes desde el frontend
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Función para manejar la solicitud GET y obtener la lista de médicos activos
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: CORS });

  // Crear un cliente de Supabase con el token del usuario
  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401, headers: CORS });

  // Crear un cliente de administración de Supabase para realizar operaciones en la base de datos
  const admin = getSupabaseAdmin();

  // Obtener la lista de médicos activos desde la base de datos
  const { data: medicos } = await admin
    .from('medicos')
    .select('id, nombre, apellido, rut, especialidad_id, especialidades(id, nombre), recintos(nombre, comuna)')
    .eq('activo', true)
    .order('apellido');

    // Retornar la lista de médicos en la respuesta
  return NextResponse.json({ medicos: medicos ?? [] }, { headers: CORS });
}

// Función para manejar las solicitudes OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
