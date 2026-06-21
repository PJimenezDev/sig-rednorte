import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Ruta API para obtener las citas asignadas a un médico específico y la lista de espera correspondiente a su especialidad. Requiere autenticación mediante token en el encabezado Authorization y el RUT del médico como parámetro de consulta. Devuelve las citas asignadas al médico y la lista de espera ordenada por posición en la fila.
const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

// Se definen los encabezados CORS para permitir solicitudes desde el origen especificado (http://localhost:3010) y los métodos y encabezados permitidos. Esto es importante para las solicitudes CORS preflight desde el frontend.
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


// Función para manejar solicitudes GET, que obtiene las citas asignadas a un médico específico y la lista de espera correspondiente a su especialidad. Verifica que el médico esté autenticado, que el RUT del médico sea válido y que el médico exista en la base de datos. Luego, obtiene las agendas del médico, las citas asociadas a esas agendas y la lista de espera para la especialidad del médico, y devuelve esta información en la respuesta.

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const rut = req.nextUrl.searchParams.get('rut');
  if (!rut) return NextResponse.json({ error: 'RUT requerido' }, { status: 400, headers: CORS });

  const admin = getSupabaseAdmin();

  const { data: medicos } = await admin
    .from('medicos')
    .select('id, rut, especialidades(id, nombre)');

  const medico = medicos?.find((m: any) => cleanRut(m.rut) === cleanRut(rut));
  if (!medico) return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404, headers: CORS });

  const especialidad = Array.isArray(medico.especialidades)
    ? medico.especialidades[0]
    : medico.especialidades;

  return NextResponse.json({ especialidad: especialidad ?? null }, { headers: CORS });
}

// Función para manejar solicitudes OPTIONS, que responde a las solicitudes CORS preflight desde el frontend. Devuelve una respuesta con estado 204 (No Content) y los encabezados CORS definidos para permitir la comunicación entre el frontend y esta ruta de la API.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
