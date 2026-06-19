'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const API = process.env.NEXT_PUBLIC_API_MEDICO ?? 'http://localhost:3023';

const formatearRut = (valor: string): string => {
  const limpio = valor.replace(/[^0-9kK-]/g, '');
  if (!limpio.includes('-')) return limpio;
  const [cuerpo, dv] = limpio.split('-');
  const dvLimpio = (dv ?? '').replace(/[^0-9kK]/g, '').slice(0, 1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dvLimpio ? `${cuerpoFormateado}-${dvLimpio}` : `${cuerpoFormateado}-`;
};

const rutTieneFormato = (rut: string): boolean => {
  const partes = rut.split('-');
  return partes.length === 2 && partes[0].length > 0 && partes[1].length === 1;
};

export default function DashboardMedico() {
  const [nombre, setNombre] = useState<string>('Médico');
  const [rut, setRut] = useState<string>('—');
  const [citas, setCitas] = useState<any[]>([]);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAgendar, setModalAgendar] = useState(false);
  const [especialidadMedico, setEspecialidadMedico] = useState('');
  const [formCita, setFormCita] = useState({ rutPaciente: '', rutMedico: '', fecha: '', hora: '' });
  const [agendarError, setAgendarError] = useState<string | null>(null);
  const [agendarLoading, setAgendarLoading] = useState(false);

  const [modalAsignar, setModalAsignar] = useState<{ pacienteId: string; listaEsperaId: string; nombrePaciente: string } | null>(null);
  const [asignarFecha, setAsignarFecha] = useState('');
  const [asignarHora, setAsignarHora] = useState('');
  const [asignarError, setAsignarError] = useState<string | null>(null);
  const [asignarLoading, setAsignarLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    const n = sessionStorage.getItem('nombre_usuario');
    if (n) setNombre(n);
    const r = sessionStorage.getItem('rut_usuario');
    if (r) setRut(r);

    fetchDashboard(token, r ?? '');
  }, []);

  const fetchDashboard = async (token: string, rutMedico: string) => {
    try {
      const res = await fetch(`${API}/api/medico/dashboard?rut=${encodeURIComponent(rutMedico)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setCitas(data.citas ?? []);
      setListaEspera(data.listaEspera ?? []);
    } catch {
      console.error('Error cargando datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  const abrirModalAsignar = (entrada: any) => {
    const p = Array.isArray(entrada.pacientes) ? entrada.pacientes[0] : entrada.pacientes;
    const nombrePaciente = p
      ? `${p.nombre} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`.trim()
      : 'Paciente';
    setModalAsignar({ pacienteId: p?.id, listaEsperaId: entrada.id, nombrePaciente });
    setAsignarFecha('');
    setAsignarHora('');
    setAsignarError(null);
  };

  const handleAsignarCita = async () => {
    if (!asignarFecha || !asignarHora) { setAsignarError('Selecciona fecha y hora.'); return; }
    if (!modalAsignar) return;
    const token = sessionStorage.getItem('access_token');
    const rutSesion = sessionStorage.getItem('rut_usuario');
    if (!token) return;
    setAsignarLoading(true);
    setAsignarError(null);
    try {
      const res = await fetch(`${API}/api/medico/asignar-cita`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rutMedico: rutSesion,
          pacienteId: modalAsignar.pacienteId,
          listaEsperaId: modalAsignar.listaEsperaId,
          fecha: asignarFecha,
          hora: asignarHora,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAsignarError(data.error ?? 'Error al asignar.'); return; }
      setModalAsignar(null);
      fetchDashboard(token, rutSesion ?? '');
    } catch {
      setAsignarError('Error de conexión.');
    } finally {
      setAsignarLoading(false);
    }
  };

  const abrirModal = async () => {
    const rutActual = sessionStorage.getItem('rut_usuario') ?? '';
    setFormCita({ rutPaciente: '', rutMedico: rutActual, fecha: '', hora: '' });
    setAgendarError(null);
    setEspecialidadMedico('');
    setModalAgendar(true);

    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(
        `${API}/api/medico/mi-especialidad?rut=${encodeURIComponent(rutActual)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setEspecialidadMedico(data.especialidad?.nombre ?? '');
    } catch {
      setEspecialidadMedico('');
    }
  };

  const handleAgendarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCita.rutPaciente || !formCita.fecha || !formCita.hora) {
      setAgendarError('Complete todos los campos obligatorios.');
      return;
    }
    if (!rutTieneFormato(formCita.rutPaciente)) {
      setAgendarError('Ingrese el RUT del paciente con guión y dígito verificador (ej: 12.345.678-9).');
      return;
    }
    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    setAgendarLoading(true);
    setAgendarError(null);
    try {
      const res = await fetch(`${API}/api/medico/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rutPaciente: formCita.rutPaciente,
          rutMedico: formCita.rutMedico,
          fecha: formCita.fecha,
          hora: formCita.hora,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAgendarError(data.error ?? 'Error al agendar la cita.'); return; }
      setModalAgendar(false);
      fetchDashboard(token, formCita.rutMedico);
    } catch {
      setAgendarError('Error de conexión. Intente nuevamente.');
    } finally {
      setAgendarLoading(false);
    }
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
            <p className={styles.logoSubtitle}>Panel Médico</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{nombre}</p>
            <p className={styles.userRut}>RUT: {rut}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.welcomeTitle}>Bienvenido al Portal</h2>
        <p className={styles.welcomeSubtitle}>Gestiona tus citas y los pacientes en espera de tu especialidad.</p>

        <div className={styles.kpiGrid}>
          <KpiCard label="Citas Confirmadas" valor={citasConfirmadas} valueClass={styles.kpiValueBlue} />
          <KpiCard label="En lista de espera" valor={listaEspera.length} valueClass={styles.kpiValueAmber} />
          <KpiCard label="Notificaciones" valor={notificaciones} valueClass={styles.kpiValueGreen} />
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Mis Citas Médicas</h3>
            {citas.length === 0 ? (
              <p className={styles.emptyState}>No tienes citas programadas.</p>
            ) : (
              <div className={styles.citasList}>
                {citas.map((cita: any) => (
                  <CitaItem key={cita.id} cita={cita} />
                ))}
              </div>
            )}
            <button className={styles.btnAgendar} onClick={abrirModal}>Agendar nueva cita</button>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Lista de Espera</h3>
            {listaEspera.length === 0 ? (
              <p className={styles.emptyState}>No hay pacientes en espera para tu especialidad.</p>
            ) : (
              <div className={styles.listaList}>
                {listaEspera.map((entrada: any) => (
                  <ListaItem key={entrada.id} datos={entrada} total={listaEspera.length} onAsignar={abrirModalAsignar} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {modalAgendar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Agendar cita</h3>
              <button type="button" className={styles.modalClose} onClick={() => setModalAgendar(false)}>×</button>
            </div>
            <form onSubmit={handleAgendarCita} className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>RUT paciente:</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="Ingrese RUT con guión y dígito verificador"
                  value={formCita.rutPaciente}
                  onChange={e => setFormCita(f => ({ ...f, rutPaciente: formatearRut(e.target.value) }))}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>Especialidad médica:</label>
                <input className={styles.formInputReadonly} type="text" value={especialidadMedico || 'Cargando...'} readOnly />
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>RUT doctor:</label>
                <input className={styles.formInputReadonly} type="text" value={formCita.rutMedico} readOnly />
              </div>
              <div className={styles.formRowFechaHora}>
                <div className={styles.formColFecha}>
                  <label className={styles.formLabel}>Fecha:</label>
                  <CalendarioMini selectedDate={formCita.fecha} onSelect={fecha => setFormCita(f => ({ ...f, fecha }))} />
                </div>
                <div className={styles.formColHora}>
                  <label className={styles.formLabel}>Hora:</label>
                  <input className={styles.formInput} type="time" value={formCita.hora} onChange={e => setFormCita(f => ({ ...f, hora: e.target.value }))} />
                </div>
              </div>
              {agendarError && <p className={styles.formError}>{agendarError}</p>}
              <div className={styles.modalBtnGroup}>
                <button type="submit" className={styles.btnConfirmarCita} disabled={agendarLoading}>
                  {agendarLoading ? 'Agendando...' : 'Agendar cita'}
                </button>
                <button type="button" className={styles.btnCancelarCita} onClick={() => setModalAgendar(false)}>
                  No agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAsignar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Asignarme esta cita</h3>
              <button type="button" className={styles.modalClose} onClick={() => setModalAsignar(null)}>×</button>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569' }}>
              Paciente: <strong>{modalAsignar.nombrePaciente}</strong>
            </p>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Fecha:</label>
              <input className={styles.formInput} type="date" min={new Date().toISOString().split('T')[0]} value={asignarFecha} onChange={e => setAsignarFecha(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Hora:</label>
              <input className={styles.formInput} type="time" value={asignarHora} onChange={e => setAsignarHora(e.target.value)} />
            </div>
            {asignarError && <p className={styles.formError}>{asignarError}</p>}
            <div className={styles.modalBtnGroup}>
              <button type="button" className={styles.btnConfirmarCita} onClick={handleAsignarCita} disabled={asignarLoading}>
                {asignarLoading ? 'Asignando...' : 'Confirmar cita'}
              </button>
              <button type="button" className={styles.btnCancelarCita} onClick={() => setModalAsignar(null)}>
                Cancelar
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

  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.apellido_paterno}${paciente.apellido_materno ? ` ${paciente.apellido_materno}` : ''}`
    : '—';

  return (
    <div className={styles.citaItem}>
      <div className={styles.badgeRow}>
        {cita.estado === 'asignada' && <span className={styles.badgeAsignada}>Por confirmar</span>}
        {cita.estado === 'confirmada' && <span className={styles.badgeConfirmada}>Confirmada</span>}
      </div>
      <p className={styles.citaLabelPaciente}>Paciente</p>
      <p className={styles.citaPaciente}>{nombrePaciente}</p>
      {paciente?.rut && <p className={styles.citaRut}>RUT: {paciente.rut}</p>}
      <p className={styles.citaEspecialidad}>{especialidad?.nombre || 'Especialidad'}</p>
      <p className={styles.citaDetalle}><strong>Fecha:</strong> {fechaTexto} — {horaTexto} hrs</p>
      <p className={styles.citaLugar}><strong>Lugar:</strong> {recinto?.nombre || '—'}{recinto?.comuna ? ` (${recinto.comuna})` : ''}</p>
    </div>
  );
}

function ListaItem({ datos, total, onAsignar }: { datos: any; total: number; onAsignar: (entrada: any) => void }) {
  const especialidad = Array.isArray(datos.especialidades) ? datos.especialidades[0] : datos.especialidades;
  const posicion = datos.posicion_actual_fila ?? 0;
  const porcentaje = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - posicion / total) * 100))) : 0;
  const paciente = Array.isArray(datos.pacientes) ? datos.pacientes[0] : datos.pacientes;
  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.apellido_paterno ?? ''} ${paciente.apellido_materno ?? ''}`.trim()
    : null;

  return (
    <div className={styles.listaItem}>
      <p className={styles.listaEspecialidad}>{especialidad?.nombre || 'Especialidad'}</p>
      {nombrePaciente && (
        <>
          <p className={styles.citaLabelPaciente}>Paciente</p>
          <p className={styles.citaPaciente}>{nombrePaciente}</p>
          {paciente?.rut && <p className={styles.citaRut}>RUT: {paciente.rut}</p>}
        </>
      )}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarFill} style={{ width: `${porcentaje}%` }} />
      </div>
      <div className={styles.progressFooter}>
        <span className={styles.progressTotal}>Total: {total} pacientes</span>
        <span className={styles.progressPercent}>{porcentaje}% avanzado</span>
      </div>
      <button className={styles.btnAgendar} style={{ marginTop: '10px' }} onClick={() => onAsignar(datos)}>
        Asignarme esta cita
      </button>
    </div>
  );
}

function CalendarioMini({ selectedDate, onSelect }: { selectedDate: string; onSelect: (date: string) => void }) {
  const hoy = new Date();
  const [viewYear, setViewYear] = useState(hoy.getFullYear());
  const [viewMonth, setViewMonth] = useState(hoy.getMonth());

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const primerDia = new Date(viewYear, viewMonth, 1).getDay();
  const diasEnMes = new Date(viewYear, viewMonth + 1, 0).getDate();
  const celdas: (number | null)[] = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const irMesAnterior = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const irMesSiguiente = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const seleccionarDia = (dia: number) => {
    const d = String(dia).padStart(2, '0');
    const m = String(viewMonth + 1).padStart(2, '0');
    onSelect(`${viewYear}-${m}-${d}`);
  };

  return (
    <div className={styles.calendario}>
      <div className={styles.calHeader}>
        <button type="button" className={styles.calNavBtn} onClick={irMesAnterior}>&#8249;</button>
        <span className={styles.calMesAno}>{meses[viewMonth]} {viewYear}</span>
        <button type="button" className={styles.calNavBtn} onClick={irMesSiguiente}>&#8250;</button>
      </div>
      <div className={styles.calGrid}>
        {diasSemana.map(d => <span key={d} className={styles.calNombreDia}>{d}</span>)}
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`v-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const esSel = dateStr === selectedDate;
          const esHoy = dia === hoy.getDate() && viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();
          const esPasado = new Date(viewYear, viewMonth, dia) < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          return (
            <button
              key={dia}
              type="button"
              onClick={() => !esPasado && seleccionarDia(dia)}
              disabled={esPasado}
              className={`${styles.calDia} ${esSel ? styles.calDiaSel : ''} ${esHoy && !esSel ? styles.calDiaHoy : ''} ${esPasado ? styles.calDiaPasado : ''}`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
