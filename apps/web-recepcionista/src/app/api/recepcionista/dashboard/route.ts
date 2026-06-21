import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Configuración de CORS para permitir solicitudes desde el frontend
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Crear un cliente de Supabase con el token del usuario
  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Crear un cliente de administración de Supabase para realizar operaciones en la base de datos
  const admin = getSupabaseAdmin();

  // Obtener las citas y la lista de espera de la base de datos en paralelo
  const [{ data: citas }, { data: listaEspera }] = await Promise.all([
    admin
      .from('citas')
      .select('id, estado, paciente:paciente_id(nombre, apellido_paterno, apellido_materno, rut), agendas(id, fecha_hora_inicio, medicos(nombre, apellido, recintos(nombre, comuna), especialidades(nombre)))')
      .in('estado', ['asignada', 'confirmada'])
      .order('created_at', { ascending: false }),

      // Obtener la lista de espera con información del paciente y la especialidad
    admin
      .from('lista_espera')
      .select('id, posicion_actual_fila, gravedad, especialidad_id, especialidades(nombre), pacientes:paciente_id(id, nombre, apellido_paterno, apellido_materno, rut)')
      .order('posicion_actual_fila'),
  ]);

  // Retornar las citas y la lista de espera en la respuesta
  return NextResponse.json({ citas: citas ?? [], listaEspera: listaEspera ?? [] });
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
