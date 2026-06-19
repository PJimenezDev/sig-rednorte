import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerClient } from '@sig-rednorte/database';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const sc = createServerClient(data.session.access_token);

  const { data: paciente } = await sc
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

  const { data: medico } = await sc
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
