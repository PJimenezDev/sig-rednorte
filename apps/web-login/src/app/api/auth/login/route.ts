import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

// Ruta API para manejar el inicio de sesión de usuarios (pacientes, médicos y recepcionistas). Permite a los usuarios autenticarse mediante correo electrónico y contraseña, y devuelve un token de acceso y un token de actualización junto con información adicional según el rol del usuario. Requiere autenticación mediante token en el encabezado Authorization.

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nombre, apellido_paterno, apellido_materno')
    .eq('correo', email.toLowerCase())
    .maybeSingle();

  if (paciente) {
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      role: 'paciente',
      nombre: paciente.nombre,
      apellido_paterno: paciente.apellido_paterno,
      apellido_materno: paciente.apellido_materno,
    });
  }

  const { data: medico } = await admin
    .from('medicos')
    .select('id, nombre, apellido, rut')
    .eq('correo', email.toLowerCase())
    .maybeSingle();

  const meta = data.user.user_metadata ?? {};

  if (medico) {
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      role: 'medico',
      nombre: medico.nombre ?? meta.nombre ?? email.split('@')[0],
      apellido: medico.apellido ?? meta.apellido ?? null,
      rut: medico.rut ?? meta.rut ?? null,
    });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    role: 'recepcionista',
    nombre: meta.nombre ?? email.split('@')[0],
    apellido: meta.apellido ?? null,
    rut: meta.rut ?? null,
  });
}

// Función para manejar solicitudes OPTIONS, que responde a las solicitudes CORS preflight desde el frontend. Devuelve una respuesta con estado 204 (No Content) y los encabezados CORS definidos para permitir la comunicación entre el frontend y esta ruta de la API.

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3010',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
