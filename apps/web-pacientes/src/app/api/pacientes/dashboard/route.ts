import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@sig-rednorte/database';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('correo', user.email!.toLowerCase())
    .maybeSingle();

  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

  const [{ data: listaEspera }, { data: citas }] = await Promise.all([
    supabase
      .from('lista_espera')
      .select('posicion_actual_fila, total_pacientes_especialidad, tiempo_estimado_espera_dias, especialidad_solicitada')
      .eq('paciente_id', paciente.id),
    supabase
      .from('citas')
      .select('id, estado, agendas(id, fecha_hora_inicio, medicos(nombre, apellido, recintos(nombre, comuna)))')
      .eq('paciente_id', paciente.id)
      .in('estado', ['asignada', 'confirmada'])
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({ listaEspera: listaEspera ?? [], citas: citas ?? [] });
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
