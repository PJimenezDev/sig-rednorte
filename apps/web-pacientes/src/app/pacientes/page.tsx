'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@sig-rednorte/database';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function DashboardPaciente() {
  const [user, setUser] = useState<any>(null);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [cita, setCita] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalCancelar, setModalCancelar] = useState<{ citaId: string; agendaId: string } | null>(null);
  const router = useRouter();

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/fake-claveunica');
        return;
      }
      setUser(session.user);

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

  const handleSolicitarCancelar = (citaId: string, agendaId: string) => {
    setModalCancelar({ citaId, agendaId });
  };

  const handleConfirmarCancelar = async () => {
    if (!modalCancelar) return;
    try {
      await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', modalCancelar.citaId);
      if (modalCancelar.agendaId) {
        await supabase.from('agendas').update({ disponible: true }).eq('id', modalCancelar.agendaId);
      }
      setModalCancelar(null);
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
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Cargando Portal RedNorte...</p>
      </div>
    );
  }

  const citasConfirmadas = cita?.estado === 'confirmada' ? 1 : 0;
  const notificaciones = cita?.estado === 'asignada' ? 1 : 0;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <div className={styles.logoCircle}>
            <div className={styles.logoDot} />
          </div>
          <div>
            <p className={styles.logoTitle}>RedNorte Salud</p>
            <p className={styles.logoSubtitle}>Portal del Paciente</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>
              {user?.user_metadata?.nombre?.toLowerCase() || 'Paciente'}{' '}
              {user?.user_metadata?.apellido_paterno?.toLowerCase() || ''}{' '}
              {user?.user_metadata?.apellido_materno?.toLowerCase() || ''}
            </p>
            <p className={styles.userRut}>RUT: {user?.user_metadata?.rut || '—'}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.welcomeTitle}>Bienvenido al Portal</h2>
        <p className={styles.welcomeSubtitle}>Gestiona tus citas médicas y revisa tu estado en las listas de espera.</p>

        {/* KPIs section */}
        <div className={styles.kpiGrid}>
          <KpiCard label="Citas Confirmadas" valor={citasConfirmadas} valueClass={styles.kpiValueBlue} />
          <KpiCard label="En lista de espera" valor={listaEspera.length} valueClass={styles.kpiValueAmber} />
          <KpiCard label="Notificaciones" valor={notificaciones} valueClass={styles.kpiValueGreen} />
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Mis Citas Médicas</h3>
            {cita ? (
              <CitaCard
                cita={cita}
                onConfirmar={handleConfirmarCita}
                onCancelar={handleSolicitarCancelar}
              />
            ) : (
              <p className={styles.emptyState}>No tienes citas programadas.</p>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Estado en Lista de Espera</h3>
            {listaEspera.length === 0 ? (
              <p className={styles.emptyState}>No estás en ninguna lista de espera.</p>
            ) : (
              <div className={styles.listaList}>
                {listaEspera.map((entrada: any, i: number) => (
                  <ListaEsperaCard key={i} datos={entrada} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {modalCancelar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <p className={styles.modalTitle}>Cancelar cita</p>
            <p className={styles.modalText}>
              ¿Estás seguro de que deseas cancelar esta cita? Tu lugar en la lista de espera se reasignara a otro paciente.
            </p>
            <div className={styles.modalBtnGroup}>
              <button className={styles.modalBtnSecondary} onClick={() => setModalCancelar(null)}>
                Volver
              </button>
              <button className={styles.modalBtnDanger} onClick={handleConfirmarCancelar}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, valor, valueClass }: { label: string; valor: number; valueClass: string }) {
  return (
    <div className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={`${styles.kpiValue} ${valueClass}`}>{valor}</p>
    </div>
  );
}

function CitaCard({ cita, onConfirmar, onCancelar }: {
  cita: any;
  onConfirmar: (id: string) => void;
  onCancelar: (id: string, agendaId: string) => void;
}) {
  const agenda = Array.isArray(cita.agendas) ? cita.agendas[0] : cita.agendas;
  const medico = agenda?.medicos;
  const recinto = medico?.recintos;
  const agendaId = Array.isArray(cita.agendas) ? cita.agendas[0]?.id : cita.agendas?.id;

  let fechaTexto = '—';
  let horaTexto = '—';
  if (agenda?.fecha_hora_inicio) {
    const d = new Date(agenda.fecha_hora_inicio);
    if (!isNaN(d.getTime())) {
      fechaTexto = d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      horaTexto = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }

  return (
    <div>
      <div className={styles.badgeRow}>
        {cita.estado === 'asignada' && <span className={styles.badgePending}>Por Confirmar</span>}
        {cita.estado === 'confirmada' && <span className={styles.badgeConfirmed}>Confirmada</span>}
      </div>

      <div className={styles.citaInnerCard}>
        <p className={styles.citaEspecialidad}>
          {medico ? `Dr./a ${medico.nombre} ${medico.apellido}` : 'Médico asignado'}
        </p>
        <p className={styles.citaDetail}><strong>Fecha:</strong> {fechaTexto}</p>
        <p className={styles.citaDetail}><strong>Hora:</strong> {horaTexto} hrs</p>
        <p className={styles.citaLocation}>
          <strong>Lugar:</strong> {recinto?.nombre || '—'}{recinto?.comuna ? ` (${recinto.comuna})` : ''}
        </p>
      </div>

      <div className={styles.btnGroup}>
        {cita.estado === 'asignada' && (
          <button className={styles.btnConfirm} onClick={() => onConfirmar(cita.id)}>
            Confirmar Cita
          </button>
        )}
        <button className={styles.btnCancel} onClick={() => onCancelar(cita.id, agendaId)}>
          Cancelar
        </button>
      </div>
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
    <div className={styles.citaInnerCard}>
      <p className={styles.listaEspecialidad}>{especialidad}</p>

      <div className={styles.positionRow}>
        <span className={styles.positionLabel}>Tu posición:</span>
        <span className={styles.positionNumber}>#{posicion}</span>
      </div>

      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarFill} style={{ width: `${porcentaje}%` }} />
      </div>

      <div className={styles.progressFooter}>
        <span className={styles.progressTotal}>Total: {total} pacientes</span>
        <span className={styles.progressPercent}>{porcentaje}% avanzado</span>
      </div>

      <div className={styles.timeSection}>
        <p className={styles.timeLabel}>Tiempo estimado de espera:</p>
        <p className={styles.timeValue}>~ {dias} días</p>
      </div>
    </div>
  );
}
