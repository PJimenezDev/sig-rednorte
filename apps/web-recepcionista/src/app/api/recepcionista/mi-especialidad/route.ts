import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdmin } from '@sig-rednorte/database';

const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const rut = req.nextUrl.searchParams.get('rut');
  if (!rut) return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });

  const admin = getSupabaseAdmin();

  const { data: medicos } = await admin
    .from('medicos')
    .select('id, rut, especialidades(id, nombre)');

  const medico = medicos?.find((m: any) => cleanRut(m.rut) === cleanRut(rut));

  if (!medico) return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 });

  const especialidad = Array.isArray(medico.especialidades)
    ? medico.especialidades[0]
    : medico.especialidades;

  return NextResponse.json({ especialidad: especialidad ?? null });
}

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
