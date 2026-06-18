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
    .select('id, nombre')
    .eq('correo', email.toLowerCase())
    .maybeSingle();

  const role = paciente ? 'paciente' : 'staff';
  const nombre = paciente?.nombre ?? data.user.user_metadata?.nombre ?? null;

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    role,
    nombre,
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
