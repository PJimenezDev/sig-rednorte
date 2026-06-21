import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Ruta API para asignar una cita a un paciente desde la lista de espera. Permite al médico asignar una hora a un paciente específico para una fecha y hora determinadas. Requiere autenticación mediante token en el encabezado Authorization.
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Función para manejar solicitudes POST, que permite al médico asignar una cita a un paciente desde la lista de espera. Verifica que el médico esté autenticado, que el paciente exista y que se puedan crear la agenda y la cita correspondientes. También elimina la solicitud de la lista de espera una vez que se ha asignado la cita.
const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

// Función para manejar solicitudes POST, que permite al médico asignar una cita a un paciente desde la lista de espera. Verifica que el médico esté autenticado, que el paciente exista y que se puedan crear la agenda y la cita correspondientes. También elimina la solicitud de la lista de espera una vez que se ha asignado la cita.
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { rutPaciente, rutMedico, fecha, hora } = await req.json();

  if (!rutPaciente || !rutMedico || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400, headers: CORS });
  }

  const admin = getSupabaseAdmin();
  const rutPacienteNorm = cleanRut(rutPaciente);
  const rutMedicoNorm = cleanRut(rutMedico);

  const { data: pacientes } = await admin.from('pacientes').select('id, rut');
  const paciente = pacientes?.find((p: any) => cleanRut(p.rut) === rutPacienteNorm);
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado con ese RUT' }, { status: 404, headers: CORS });
  }

  const { data: medicos } = await admin.from('medicos').select('id, rut');
  const medico = medicos?.find((m: any) => cleanRut(m.rut) === rutMedicoNorm);
  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado con ese RUT' }, { status: 404, headers: CORS });
  }

  const fechaHora = `${fecha}T${hora}:00`;
  const fechaHoraFin = new Date(new Date(fechaHora).getTime() + 30 * 60 * 1000).toISOString();

  const { data: agendaExistente } = await admin
    .from('agendas')
    .select('id')
    .eq('medico_id', medico.id)
    .eq('fecha_hora_inicio', fechaHora)
    .eq('disponible', true)
    .maybeSingle();

  let agendaId: string;

  if (agendaExistente) {
    agendaId = agendaExistente.id;
    await admin.from('agendas').update({ disponible: false }).eq('id', agendaId);
  } else {
    const { data: nuevaAgenda, error: agendaError } = await admin
      .from('agendas')
      .insert({ medico_id: medico.id, fecha_hora_inicio: fechaHora, fecha_hora_fin: fechaHoraFin, disponible: false })
      .select('id')
      .single();

    if (agendaError || !nuevaAgenda) {
      return NextResponse.json(
        { error: `Error al crear agenda: ${agendaError?.message}` },
        { status: 500, headers: CORS }
      );
    }
    agendaId = nuevaAgenda.id;
  }

  const { data: cita, error: citaError } = await admin
    .from('citas')
    .insert({ paciente_id: paciente.id, agenda_id: agendaId, estado: 'asignada' })
    .select('id')
    .single();

  if (citaError || !cita) {
    return NextResponse.json(
      { error: `Error al crear cita: ${citaError?.message}` },
      { status: 500, headers: CORS }
    );
  }

  return NextResponse.json({ success: true, citaId: cita.id }, { headers: CORS });
}

// Función para manejar solicitudes OPTIONS, que responde a las solicitudes CORS preflight desde el frontend. Devuelve una respuesta con estado 204 (No Content) y los encabezados CORS definidos para permitir la comunicación entre el frontend y esta ruta de la API.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
