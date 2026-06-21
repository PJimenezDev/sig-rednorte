import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Encabezados CORS para permitir solicitudes desde el frontend
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Función para limpiar y normalizar el RUT
const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

// Función para manejar la creación de citas
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Crear un cliente de Supabase con el token del usuario
  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Obtener los datos del cuerpo de la solicitud
  const { rutPaciente, rutMedico, fecha, hora } = await req.json();

  // Validar que todos los campos obligatorios estén presentes
  if (!rutPaciente || !rutMedico || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  // Obtener el cliente de administración de Supabase para realizar operaciones en la base de datos
  const admin = getSupabaseAdmin();
  const rutPacienteNorm = cleanRut(rutPaciente);
  const rutMedicoNorm = cleanRut(rutMedico);

  // Buscar el paciente y el médico en la base de datos usando sus RUTs normalizados
  const { data: pacientes } = await admin.from('pacientes').select('id, rut');
  const paciente = pacientes?.find((p: any) => cleanRut(p.rut) === rutPacienteNorm);

  // Validar que el paciente y el médico existan en la base de datos
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado con ese RUT' }, { status: 404, headers: CORS_HEADERS });
  }

  // Buscar el médico en la base de datos usando su RUT normalizado
  const { data: medicos } = await admin.from('medicos').select('id, rut');
  const medico = medicos?.find((m: any) => cleanRut(m.rut) === rutMedicoNorm);

  // Validar que el médico exista en la base de datos
  if (!medico) {
    return NextResponse.json({ error: 'Médico no encontrado con ese RUT' }, { status: 404, headers: CORS_HEADERS });
  }

//  Crear la fecha y hora de inicio y fin de la cita
  const fechaHora = `${fecha}T${hora}:00`;
  const fechaHoraFin = new Date(new Date(fechaHora).getTime() + 30 * 60 * 1000).toISOString();

  // Verificar si ya existe una agenda para el médico en la fecha y hora especificadas
  const { data: agendaExistente } = await admin
    .from('agendas')
    .select('id')
    .eq('medico_id', medico.id)
    .eq('fecha_hora_inicio', fechaHora)
    .eq('disponible', true)
    .maybeSingle();

  let agendaId: string;

  // Si existe una agenda, actualizarla a no disponible; si no, crear una nueva agenda
  if (agendaExistente) {
    agendaId = agendaExistente.id;
    await admin.from('agendas').update({ disponible: false }).eq('id', agendaId);

    // Validar que la agenda se haya actualizado correctamente
  } else {
    const { data: nuevaAgenda, error: agendaError } = await admin
      .from('agendas')
      .insert({ medico_id: medico.id, fecha_hora_inicio: fechaHora, fecha_hora_fin: fechaHoraFin, disponible: false })
      .select('id')
      .single();

      // Validar que la agenda se haya creado correctamente
    if (agendaError || !nuevaAgenda) {
      return NextResponse.json(
        { error: `Error al crear agenda: ${agendaError?.message ?? 'desconocido'} | code: ${agendaError?.code}` },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Asignar el ID de la nueva agenda a la variable agendaId
    agendaId = nuevaAgenda.id;
  }

  // Crear la cita en la base de datos con el paciente y la agenda correspondiente
  const { data: cita, error: citaError } = await admin
    .from('citas')
    .insert({ paciente_id: paciente.id, agenda_id: agendaId, estado: 'asignada' })
    .select('id')
    .single();

    // Validar que la cita se haya creado correctamente
  if (citaError || !cita) {
    return NextResponse.json(
      { error: `Error al crear cita: ${citaError?.message ?? 'desconocido'} | code: ${citaError?.code}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // Retornar la respuesta exitosa con el ID de la cita creada
  return NextResponse.json({ success: true, citaId: cita.id }, { headers: CORS_HEADERS });
}

// Función para manejar las solicitudes OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
