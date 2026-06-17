'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@sig-rednorte/database';
import { useRouter } from 'next/navigation';

export default function DashboardPaciente() {
  const [user, setUser] = useState<any>(null);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [cita, setCita] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/fake-claveunica');
        return;
      }
      setUser(session.user);

      // Obtener el paciente por correo para usar su pacientes.id en las queries
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('id')
        .eq('correo', session.user.email)
        .maybeSingle();

      const pacienteId = pacienteData?.id;
      if (!pacienteId) {
        setLoading(false);
        return;
      }

      const { data: vistaData } = await supabase
        .from('vista_portal_paciente')
        .select('*')
        .eq('paciente_id', pacienteId);

      setListaEspera(vistaData ?? []);

      const { data: citaData, error: citaErr } = await supabase
        .from('citas')
        .select(`
          id,
          estado,
          agendas (
            id,
            fecha_hora_inicio,
            fecha_hora_fin,
            medicos (
              nombre,
              apellido,
              recintos (nombre, comuna)
            )
          )
        `)
        .eq('paciente_id', pacienteId)
        .in('estado', ['asignada', 'confirmada'])
        .maybeSingle();

      setCita(!citaErr && citaData ? citaData : null);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleConfirmarCita = async (citaId: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'confirmada' })
        .eq('id', citaId);
      if (error) throw error;
      alert('¡Cita médica confirmada con éxito!');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error al confirmar:', err.message);
    }
  };

  const handleCancelarCita = async (citaId: string, agendaId: string) => {
    if (!confirm('¿Está seguro de que desea cancelar esta cita programada?')) return;
    try {
      await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', citaId);
      if (agendaId) {
        await supabase.from('agendas').update({ disponible: true }).eq('id', agendaId);
      }
      alert('Cita cancelada correctamente. Tu lugar en la lista de espera se mantendrá vigente.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error al cancelar:', err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/fake-claveunica');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f6' }}>
        <p style={{ fontWeight: '500', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>Cargando Portal RedNorte...</p>
      </div>
    );
  }

  const citasConfirmadas = cita?.estado === 'confirmada' ? 1 : 0;
  const enListaEspera = listaEspera.length;
  const notificaciones = cita?.estado === 'asignada' ? 1 : 0;

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>

      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ border: '2px solid #0044b1', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef3b2c', borderRadius: '50%' }}></div>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>RedNorte Salud</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Portal del Paciente</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', textTransform: 'capitalize' }}>
              {user?.user_metadata?.nombre?.toLowerCase() || 'Paciente'}{' '}
              {user?.user_metadata?.apellido_paterno?.toLowerCase() || ''}{' '}
              {user?.user_metadata?.apellido_materno?.toLowerCase() || ''}
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>RUT: {user?.user_metadata?.rut || '—'}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px' }}>

        <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>Bienvenido al Portal</h2>
        <p style={{ margin: '0 0 28px 0', fontSize: '14px', color: '#64748b' }}>Gestiona tus citas médicas y revisa tu estado en las listas de espera.</p>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <KpiCard label="Citas Confirmadas" valor={citasConfirmadas} color="#0044b1" />
          <KpiCard label="En lista de espera" valor={enListaEspera} color="#f59e0b" />
          <KpiCard label="Notificaciones" valor={notificaciones} color="#22c55e" />
        </div>

        {/* Dos columnas siempre visibles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Columna izquierda: Mis Citas */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Mis Citas Médicas</h3>

            {cita ? (
              <CitaCard
                cita={cita}
                onConfirmar={handleConfirmarCita}
                onCancelar={handleCancelarCita}
              />
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>No tienes citas programadas.</p>
              </div>
            )}
          </section>

          {/* Columna derecha: Lista de Espera */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Estado en Lista de Espera</h3>

            {listaEspera.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>No estás en ninguna lista de espera.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {listaEspera.map((entrada: any, i: number) => (
                  <ListaEsperaCard key={i} datos={entrada} />
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

/* ── Subcomponentes ── */

function KpiCard({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color }}>{valor}</p>
    </div>
  );
}

function CitaCard({ cita, onConfirmar, onCancelar }: { cita: any; onConfirmar: (id: string) => void; onCancelar: (id: string, agendaId: string) => void }) {
  const agenda = Array.isArray(cita.agendas) ? cita.agendas[0] : cita.agendas;
  const medico = agenda?.medicos;
  const recinto = medico?.recintos;

  let fechaTexto = '—';
  let horaTexto = '—';
  if (agenda?.fecha_hora_inicio) {
    const d = new Date(agenda.fecha_hora_inicio);
    if (!isNaN(d.getTime())) {
      fechaTexto = d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      horaTexto = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }

  const agendaId = Array.isArray(cita.agendas) ? cita.agendas[0]?.id : cita.agendas?.id;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        {cita.estado === 'asignada' && (
          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>
            Por Confirmar
          </span>
        )}
        {cita.estado === 'confirmada' && (
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>
            Confirmada
          </span>
        )}
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
        <p style={{ margin: '0 0 10px 0', color: '#0044b1', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {medico ? `Dr./a ${medico.nombre} ${medico.apellido}` : 'Médico asignado'}
        </p>
        <p style={{ margin: '5px 0', fontSize: '13px', color: '#475569', textTransform: 'capitalize' }}>
          <strong>Fecha:</strong> {fechaTexto}
        </p>
        <p style={{ margin: '5px 0', fontSize: '13px', color: '#475569' }}>
          <strong>Hora:</strong> {horaTexto} hrs
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          <strong>Lugar:</strong> {recinto?.nombre || '—'}{recinto?.comuna ? ` (${recinto.comuna})` : ''}
        </p>
      </div>

      {cita.estado === 'asignada' && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={() => onConfirmar(cita.id)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#22c55e', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
          >
            Confirmar Cita
          </button>
          <button
            onClick={() => onCancelar(cita.id, agendaId)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: '#fff', color: '#ef4444', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function ListaEsperaCard({ datos }: { datos: any }) {
  const posicion = datos?.posicion_actual_fila ?? '—';
  const total = datos?.total_pacientes_especialidad ?? '—';
  const dias = datos?.tiempo_estimado_espera_dias ?? '—';
  const especialidad = datos?.especialidad_solicitada ?? 'Especialidad';
  const porcentaje = (typeof posicion === 'number' && typeof total === 'number' && total > 0)
    ? Math.max(0, Math.min(100, Math.round((1 - posicion / total) * 100)))
    : 0;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
      <p style={{ margin: '0 0 12px 0', color: '#22c55e', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {especialidad}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Tu posición:</span>
        <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>#{posicion}</span>
      </div>

      <div style={{ backgroundColor: '#e2e8f0', height: '10px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px' }}>
        <div style={{ backgroundColor: '#0044b1', width: `${porcentaje}%`, height: '100%', borderRadius: '6px', transition: 'width 0.4s ease-out' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Total: {total} pacientes</span>
        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{porcentaje}% avanzado</span>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Tiempo estimado de espera:</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>~ {dias} días</p>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 18px 0',
  fontSize: '15px',
  fontWeight: '700',
  color: '#0f172a',
  borderBottom: '1px solid #f1f5f9',
  paddingBottom: '12px',
};
