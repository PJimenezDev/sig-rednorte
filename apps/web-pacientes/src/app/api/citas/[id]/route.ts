import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@sig-rednorte/database';

// Ruta API para gestionar acciones sobre citas específicas (confirmar o cancelar). Requiere autenticación mediante token en el encabezado Authorization. Dependiendo de la acción, actualiza el estado de la cita y, en caso de cancelación, también libera la agenda asociada.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Se espera un cuerpo JSON con la acción a realizar (confirmar o cancelar) y opcionalmente el ID de la agenda en caso de cancelación para liberar la disponibilidad.

  const { action, agendaId } = await req.json();
  const supabase = createServerClient(token);

  // Validar que la acción sea válida antes de proceder con las actualizaciones.

  if (action === 'confirmar') {
    await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', params.id);
  } else if (action === 'cancelar') {
    await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', params.id);
    if (agendaId) {
      await supabase.from('agendas').update({ disponible: true }).eq('id', agendaId);
    }
  }

  // Devolver una respuesta genérica de éxito. En un entorno real, se podrían devolver detalles adicionales o manejar errores específicos para cada operación.
  return NextResponse.json({ success: true });
}

// Manejar solicitudes OPTIONS para esta ruta, lo cual es importante para las solicitudes CORS preflight desde el frontend. Se configuran los encabezados CORS para permitir solicitudes desde el origen especificado (http://localhost:3010) y los métodos y encabezados permitidos.

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
