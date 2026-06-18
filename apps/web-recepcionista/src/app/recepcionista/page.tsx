'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@sig-rednorte/database';
import styles from './page.module.css';

export default function DashboardRecepcionista() {
  const [user, setUser] = useState<any>(null);
  const [citas, setCitas] = useState<any[]>([]);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (sessionUser: any) => {
    try {
      setUser(sessionUser);
      setLoading(false);

      const { data: citasData } = await supabase
        .from('citas')
        .select(`
          id,
          estado,
          paciente_id,
          agendas (
            id,
            fecha_hora_inicio,
            fecha_hora_fin,
            medicos (
              nombre,
              apellido,
              especialidades (nombre),
              recintos (nombre, comuna)
            )
          )
        `)
        .in('estado', ['asignada', 'confirmada'])
        .order('id');

      const citasConPaciente = await Promise.all(
        (citasData ?? []).map(async (c: any) => {
          const { data: paciente } = await supabase
            .from('pacientes')
            .select('nombre, apellido_paterno, apellido_materno')
            .eq('id', c.paciente_id)
            .maybeSingle();
          return { ...c, paciente };
        })
      );

      setCitas(citasConPaciente);

      const { data: listaData } = await supabase
        .from('lista_espera')
        .select(`
          id,
          gravedad,
          posicion_actual_fila,
          score_triaje_calculado,
          estado,
          especialidad_id,
          especialidades (nombre)
        `)
        .eq('estado', 'en_espera');

      setListaEspera(listaData ?? []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const hash = window.location.hash;

      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token  = params.get('access_token')  ?? '';
        const refresh_token = params.get('refresh_token') ?? '';

        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error || !data.session) {
          window.location.href = 'http://localhost:3022/login';
          return;
        }
        await fetchData(data.session.user);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = 'http://localhost:3022/login';
          return;
        }
        await fetchData(session.user);
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = 'http://localhost:3022/login';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Cargando Panel RedNorte...</p>
      </div>
    );
  }

  const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length;
  const notificaciones = citas.filter(c => c.estado === 'asignada').length;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <div className={styles.logoCircle}>
            <div className={styles.logoDot} />
          </div>
          <div>
            <p className={styles.logoTitle}>RedNorte Salud</p>
            <p className={styles.logoSubtitle}>Panel Recepcionista</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>
              {user?.user_metadata?.nombre?.toLowerCase() || 'Recepcionista'}{' '}
              {user?.user_metadata?.apellido_paterno?.toLowerCase() || ''}
            </p>
            <p className={styles.userRut}>RUT: {user?.user_metadata?.rut || '—'}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.welcomeTitle}>Bienvenido al Portal</h2>
        <p className={styles.welcomeSubtitle}>Gestiona las citas médicas y el estado de las listas de espera de tus pacientes.</p>

        <div className={styles.kpiGrid}>
          <KpiCard label="Citas Confirmadas" valor={citasConfirmadas} valueClass={styles.kpiValueBlue} />
          <KpiCard label="En lista de espera" valor={listaEspera.length} valueClass={styles.kpiValueAmber} />
          <KpiCard label="Notificaciones" valor={notificaciones} valueClass={styles.kpiValueGreen} />
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Citas Médicas</h3>
            {citas.length === 0 ? (
              <p className={styles.emptyState}>No hay citas programadas.</p>
            ) : (
              <div className={styles.citasList}>
                {citas.map((cita: any) => (
                  <CitaItem key={cita.id} cita={cita} />
                ))}
              </div>
            )}
            <button className={styles.btnAgendar}>Agendar nueva cita</button>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Lista de Espera</h3>
            {listaEspera.length === 0 ? (
              <p className={styles.emptyState}>No hay pacientes en lista de espera.</p>
            ) : (
              <div className={styles.listaList}>
                {listaEspera.map((entrada: any) => (
                  <ListaItem key={entrada.id} datos={entrada} total={listaEspera.length} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
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

function CitaItem({ cita }: { cita: any }) {
  const agenda = Array.isArray(cita.agendas) ? cita.agendas[0] : cita.agendas;
  const medico = agenda?.medicos;
  const recinto = medico?.recintos;
  const especialidad = Array.isArray(medico?.especialidades) ? medico.especialidades[0] : medico?.especialidades;
  const paciente = cita.paciente;

  let fechaTexto = '—';
  let horaTexto = '—';
  if (agenda?.fecha_hora_inicio) {
    const d = new Date(agenda.fecha_hora_inicio);
    if (!isNaN(d.getTime())) {
      fechaTexto = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' });
      horaTexto = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }

  return (
    <div className={styles.citaItem}>
      <div className={styles.badgeRow}>
        {cita.estado === 'asignada' && <span className={styles.badgeAsignada}>Por confirmar</span>}
        {cita.estado === 'confirmada' && <span className={styles.badgeConfirmada}>Confirmada</span>}
      </div>
      <p className={styles.citaEspecialidad}>{especialidad?.nombre || 'Especialidad'}</p>
      <p className={styles.citaPaciente}>
        {paciente ? `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}` : '—'}
      </p>
      <p className={styles.citaDetalle}><strong>Fecha:</strong> {fechaTexto} — {horaTexto} hrs</p>
      <p className={styles.citaLugar}><strong>Lugar:</strong> {recinto?.nombre || '—'}{recinto?.comuna ? ` (${recinto.comuna})` : ''}</p>
    </div>
  );
}

function ListaItem({ datos, total }: { datos: any; total: number }) {
  const especialidad = Array.isArray(datos.especialidades) ? datos.especialidades[0] : datos.especialidades;
  const posicion = datos.posicion_actual_fila ?? 0;
  const porcentaje = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - posicion / total) * 100))) : 0;

  const prioridadLabel: Record<string, string> = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
  };

  return (
    <div className={styles.listaItem}>
      <p className={styles.listaEspecialidad}>{especialidad?.nombre || 'Especialidad'}</p>
      <p className={styles.listaPrioridad}>
        <strong>Prioridad:</strong> {prioridadLabel[datos.gravedad] ?? datos.gravedad ?? '—'}
      </p>
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarFill} style={{ width: `${porcentaje}%` }} />
      </div>
      <div className={styles.progressFooter}>
        <span className={styles.progressTotal}>Total: {total} pacientes</span>
        <span className={styles.progressPercent}>{porcentaje}% avanzado</span>
      </div>
    </div>
  );
}
