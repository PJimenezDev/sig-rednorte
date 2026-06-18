import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@sig-rednorte/database';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { action, agendaId } = await req.json();
  const supabase = createServerClient(token);

  if (action === 'confirmar') {
    await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', params.id);
  } else if (action === 'cancelar') {
    await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', params.id);
    if (agendaId) {
      await supabase.from('agendas').update({ estado: 'disponible' }).eq('id', agendaId);
    }
  }

  return NextResponse.json({ success: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3010',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
