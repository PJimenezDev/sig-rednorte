import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@sig-rednorte/database';

const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

export async function POST(req: NextRequest) {
  const { rut } = await req.json();
  if (!rut) return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });

  const normalizedRut = cleanRut(rut);
  const admin = getSupabaseAdmin();

  const { data: pacientes } = await admin.from('pacientes').select('*');
  const paciente = pacientes?.find((p: any) => cleanRut(p.rut) === normalizedRut);

  if (!paciente) {
    return NextResponse.json({ error: 'RUT ciudadano no registrado en la base de datos de la RedNorte.' }, { status: 404 });
  }

  const expectedPassword = `secret_token_${normalizedRut}`;
  const userMetadata = {
    rut: paciente.rut,
    nombre: paciente.nombre,
    apellido_paterno: paciente.apellido_paterno,
    apellido_materno: paciente.apellido_materno,
    fecha_nacimiento: paciente.fecha_nacimiento,
  };

  const { error: createError } = await admin.auth.admin.createUser({
    email: paciente.correo,
    email_confirm: true,
    password: expectedPassword,
    user_metadata: userMetadata,
  });

  if (createError) {
    const isExisting =
      createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('exist') ||
      (createError as any).status === 422;

    if (!isExisting) {
      return NextResponse.json({ error: `Error al registrar usuario: ${createError.message}` }, { status: 500 });
    }

    const { data: rpcData } = await admin.rpc('get_auth_user_by_email', { user_email: paciente.correo });
    if (rpcData?.length > 0) {
      await admin.auth.admin.updateUserById(rpcData[0].id, { password: expectedPassword, user_metadata: userMetadata });
    }
  }

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: paciente.correo,
    password: expectedPassword,
  });

  if (signInError || !data.session) {
    return NextResponse.json({ error: 'Error al autenticar con ClaveÚnica' }, { status: 500 });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    role: 'paciente',
    nombre: paciente.nombre,
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
