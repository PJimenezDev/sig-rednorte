import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Ruta API para gestionar la solicitud de hora para un paciente autenticado. Permite al paciente solicitar una hora para una especialidad y recinto específicos, y también cancelar una solicitud existente. Requiere autenticación mediante token en el encabezado Authorization.
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3010',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Función para manejar solicitudes GET, que devuelve la información necesaria para que el paciente pueda solicitar una hora, como la lista de especialidades, recintos y médicos disponibles.
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Validar el token y obtener la información del usuario autenticado. Si el token es inválido o no se encuentra el paciente asociado, se devuelve un error correspondiente.
  const supabase = createServerClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Obtener la información de especialidades, recintos y médicos activos en paralelo para optimizar el tiempo de respuesta. Esta información es necesaria para que el paciente pueda seleccionar la especialidad y recinto al solicitar una hora.
  const admin = getSupabaseAdmin();
  const [{ data: especialidades }, { data: recintos }, { data: medicoRecintos }] = await Promise.all([
    admin.from('especialidades').select('id, nombre').order('nombre'),
    admin.from('recintos').select('id, nombre, comuna').order('nombre'),
    admin.from('medicos').select('especialidad_id, recinto_id').eq('activo', true),
  ]);

  // Devolver la información de especialidades, recintos y médicos disponibles para que el frontend pueda mostrarla al paciente al momento de solicitar una hora. Si no se encuentran registros, se devuelve un array vacío para cada uno.
  return NextResponse.json({
    especialidades: especialidades ?? [],
    recintos: recintos ?? [],
    medicoRecintos: medicoRecintos ?? [],
  }, { headers: CORS });
}

// Función para manejar solicitudes POST, que permite al paciente solicitar una hora para una especialidad y recinto específicos. Verifica que el paciente no tenga una solicitud activa para la misma especialidad antes de insertar la nueva solicitud en la base de datos.
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { especialidadId, recintoId } = await req.json();
  if (!especialidadId || !recintoId) {
    return NextResponse.json({ error: 'Especialidad y recinto son requeridos' }, { status: 400, headers: CORS });
  }

  const admin = getSupabaseAdmin();

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, fecha_nacimiento')
    .eq('correo', user.email!.toLowerCase())
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404, headers: CORS });
  }

  const { data: yaExiste } = await admin
    .from('lista_espera')
    .select('id')
    .eq('paciente_id', paciente.id)
    .eq('especialidad_id', especialidadId)
    .maybeSingle();

  if (yaExiste) {
    return NextResponse.json(
      { error: 'Ya tienes una solicitud activa para esta especialidad' },
      { status: 409, headers: CORS }
    );
  }

  const { count } = await admin
    .from('lista_espera')
    .select('*', { count: 'exact', head: true })
    .eq('especialidad_id', especialidadId);

  const posicion = (count ?? 0) + 1;

  let edadEnIngreso = 0;
  if (paciente.fecha_nacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(paciente.fecha_nacimiento);
    edadEnIngreso = hoy.getFullYear() - nacimiento.getFullYear();
    const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
    if (hoy < cumpleEsteAnio) edadEnIngreso -= 1;
  }

  const { error: insertError } = await admin.from('lista_espera').insert({
    paciente_id: paciente.id,
    especialidad_id: especialidadId,
    recinto_id: recintoId,
    posicion_actual_fila: posicion,
    edad_en_ingreso: edadEnIngreso,
  });

  if (insertError) {
    return NextResponse.json(
      { error: `Error al solicitar hora: ${insertError.message}` },
      { status: 500, headers: CORS }
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}

// Función para manejar solicitudes DELETE, que permite al paciente cancelar una solicitud de hora existente. Verifica que la solicitud pertenezca al paciente autenticado antes de eliminarla de la base de datos.

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: CORS });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401, headers: CORS });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400, headers: CORS });

  const admin = getSupabaseAdmin();

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('correo', user.email!.toLowerCase())
    .maybeSingle();

  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404, headers: CORS });

  const { error: deleteError } = await admin
    .from('lista_espera')
    .delete()
    .eq('id', id)
    .eq('paciente_id', paciente.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500, headers: CORS });

  return NextResponse.json({ success: true }, { headers: CORS });
}

// Función para manejar solicitudes OPTIONS, que es importante para las solicitudes CORS preflight desde el frontend. Se configuran los encabezados CORS para permitir solicitudes desde el origen especificado (http://localhost:3010) y los métodos y encabezados permitidos.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
