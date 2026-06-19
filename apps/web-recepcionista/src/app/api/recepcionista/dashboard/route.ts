import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const admin = getSupabaseAdmin();

  const [{ data: citas }, { data: listaEspera }] = await Promise.all([
    admin
      .from('citas')
      .select('id, estado, paciente:paciente_id(nombre, apellido_paterno, apellido_materno, rut), agendas(id, fecha_hora_inicio, medicos(nombre, apellido, recintos(nombre, comuna), especialidades(nombre)))')
      .order('created_at', { ascending: false }),
    admin
      .from('lista_espera')
      .select('id, posicion_actual_fila, gravedad, especialidades(nombre), pacientes:paciente_id(id, nombre, apellido_paterno, apellido_materno, rut)')
      .order('posicion_actual_fila'),
  ]);

  return NextResponse.json({ citas: citas ?? [], listaEspera: listaEspera ?? [] });
}

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
