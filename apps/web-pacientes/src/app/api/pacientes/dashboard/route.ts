import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Ruta API para obtener el dashboard del paciente autenticado. Requiere un token de autenticación en el encabezado Authorization. Devuelve la información de la lista de espera y las citas activas (asignadas o confirmadas) del paciente.
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Validar el token y obtener la información del usuario autenticado. Si el token es inválido o no se encuentra el paciente asociado, se devuelve un error correspondiente.

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Buscar el paciente en la base de datos utilizando el correo electrónico del usuario autenticado. Si no se encuentra el paciente, se devuelve un error 404.
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('correo', user.email!.toLowerCase())
    .maybeSingle();

    // Si el paciente no se encuentra, se devuelve un error 404. Esto puede ocurrir si el usuario autenticado no tiene un registro asociado en la tabla de pacientes, lo cual es un requisito para acceder a esta ruta.
  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

  const admin = getSupabaseAdmin();

  // Realizar consultas paralelas para obtener la lista de espera y las citas activas del paciente. Se utilizan promesas para optimizar el tiempo de respuesta al realizar ambas consultas simultáneamente.
  const [{ data: listaEspera }, { data: citas }] = await Promise.all([
    admin
      .from('lista_espera')
      .select('id, posicion_actual_fila, especialidades:especialidad_id(nombre), recintos(nombre, comuna)')
      .eq('paciente_id', paciente.id),
    admin
      .from('citas')
      .select('id, estado, agendas(id, fecha_hora_inicio, medicos(nombre, apellido, recintos(nombre, comuna)))')
      .eq('paciente_id', paciente.id)
      .in('estado', ['asignada', 'confirmada'])
      .order('created_at', { ascending: false }),
  ]);

  // Devolver la información de la lista de espera y las citas activas del paciente. Si no se encuentran registros, se devuelve un array vacío para cada uno.
  return NextResponse.json({ listaEspera: listaEspera ?? [], citas: citas ?? [] });
}

// Manejar solicitudes OPTIONS para esta ruta, lo cual es importante para las solicitudes CORS preflight desde el frontend. Se configuran los encabezados CORS para permitir solicitudes desde el origen especificado (http://localhost:3010) y los métodos y encabezados permitidos.
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
