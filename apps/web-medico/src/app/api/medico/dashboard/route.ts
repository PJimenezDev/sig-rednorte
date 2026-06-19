import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: CORS });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401, headers: CORS });

  const rutParam = req.nextUrl.searchParams.get('rut');
  if (!rutParam) return NextResponse.json({ error: 'RUT requerido' }, { status: 400, headers: CORS });

  const admin = getSupabaseAdmin();

  const { data: medicosAll } = await admin
    .from('medicos')
    .select('id, especialidad_id, rut');

  const medico = medicosAll?.find((m: any) => cleanRut(m.rut) === cleanRut(rutParam)) ?? null;

  if (!medico) return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404, headers: CORS });

  const { data: agendas } = await admin
    .from('agendas')
    .select('id')
    .eq('medico_id', medico.id);

  const agendaIds = agendas?.map((a: any) => a.id) ?? [];

  const [citasResult, { data: listaEspera }] = await Promise.all([
    agendaIds.length > 0
      ? admin
          .from('citas')
          .select('id, estado, paciente:paciente_id(nombre, apellido_paterno, apellido_materno, rut), agendas(id, fecha_hora_inicio, medicos(nombre, apellido, recintos(nombre, comuna), especialidades(nombre)))')
          .in('agenda_id', agendaIds)
          .in('estado', ['asignada', 'confirmada'])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    admin
      .from('lista_espera')
      .select('id, posicion_actual_fila, gravedad, especialidad_id, especialidades(nombre), pacientes:paciente_id(id, nombre, apellido_paterno, apellido_materno, rut)')
      .eq('especialidad_id', medico.especialidad_id)
      .order('posicion_actual_fila'),
  ]);

  return NextResponse.json({ citas: citasResult.data ?? [], listaEspera: listaEspera ?? [] }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
