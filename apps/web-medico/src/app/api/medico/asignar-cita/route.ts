import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { rutMedico, pacienteId, listaEsperaId, fecha, hora } = await req.json();

  if (!rutMedico || !pacienteId || !listaEsperaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400, headers: CORS });
  }

  const admin = getSupabaseAdmin();

  const { data: medicos } = await admin.from('medicos').select('id, rut');
  const medico = medicos?.find((m: any) => cleanRut(m.rut) === cleanRut(rutMedico));
  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404, headers: CORS });
  }

  const fechaHora = `${fecha}T${hora}:00`;
  const fechaHoraFin = new Date(new Date(fechaHora).getTime() + 30 * 60 * 1000).toISOString();

  const { data: agenda, error: agendaError } = await admin
    .from('agendas')
    .insert({ medico_id: medico.id, fecha_hora_inicio: fechaHora, fecha_hora_fin: fechaHoraFin, disponible: false })
    .select('id')
    .single();

  if (agendaError || !agenda) {
    return NextResponse.json(
      { error: `Error al crear agenda: ${agendaError?.message}` },
      { status: 500, headers: CORS }
    );
  }

  const { error: citaError } = await admin
    .from('citas')
    .insert({ paciente_id: pacienteId, agenda_id: agenda.id, estado: 'asignada' });

  if (citaError) {
    return NextResponse.json(
      { error: `Error al crear cita: ${citaError?.message}` },
      { status: 500, headers: CORS }
    );
  }

  await admin.from('lista_espera').delete().eq('id', listaEsperaId);

  return NextResponse.json({ success: true }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
