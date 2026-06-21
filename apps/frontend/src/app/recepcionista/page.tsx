'use client';

// Página principal del recepcionista en el portal de RedNorte Salud. Permite al recepcionista gestionar las citas médicas programadas, revisar el estado de las listas de espera, y asignar citas a los pacientes que se encuentran en lista de espera. El recepcionista puede agendar nuevas citas para los pacientes, asignar médicos a las solicitudes de hora médica en lista de espera, y visualizar indicadores clave de rendimiento (KPI) para tener una visión general del estado actual del sistema de salud desde su perspectiva.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const API = process.env.NEXT_PUBLIC_API_RECEPCIONISTA ?? 'http://localhost:3021';

// El componente DashboardRecepcionista es el componente principal que representa la página de inicio del recepcionista. Carga los datos del dashboard, incluyendo las citas médicas programadas y las entradas en lista de espera, al montar el componente. Permite al recepcionista agendar nuevas citas para los pacientes, asignar médicos a las solicitudes de hora médica en lista de espera, y gestionar las citas médicas programadas. También muestra indicadores clave de rendimiento (KPI) para que el recepcionista pueda tener una visión general del estado actual del sistema de salud desde su perspectiva.

const formatearRut = (valor: string): string => {
  const limpio = valor.replace(/[^0-9kK-]/g, '');
  if (!limpio.includes('-')) return limpio;
  const [cuerpo, dv] = limpio.split('-');
  const dvLimpio = (dv ?? '').replace(/[^0-9kK]/g, '').slice(0, 1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dvLimpio ? `${cuerpoFormateado}-${dvLimpio}` : `${cuerpoFormateado}-`;
};


// rutTieneFormato es una función que verifica si un RUT tiene el formato correcto, es decir, que contiene un guión y un dígito verificador al final. Esta función se utiliza para validar el formato del RUT ingresado por el recepcionista al agendar una nueva cita para un paciente, asegurando que el RUT tenga la estructura adecuada antes de enviar la solicitud a la API.

const rutTieneFormato = (rut: string): boolean => {
  const partes = rut.split('-');
  return partes.length === 2 && partes[0].length > 0 && partes[1].length === 1;
};

// Interfaz que representa la estructura de un médico en el sistema. Incluye información básica como el ID, nombre, apellido, RUT, especialidad y recintos asociados. Esta interfaz se utiliza para tipar los datos de los médicos que se cargan desde la API y se muestran en la página del recepcionista, permitiendo una gestión más eficiente de la información relacionada con los médicos en el sistema de salud.

interface Medico {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  especialidad_id: string;
  especialidades: any;
  recintos: any;
}

// El componente DashboardRecepcionista es el componente principal que representa la página de inicio del recepcionista. Carga los datos del dashboard, incluyendo las citas médicas programadas y las entradas en lista de espera, al montar el componente. Permite al recepcionista agendar nuevas citas para los pacientes, asignar médicos a las solicitudes de hora médica en lista de espera, y gestionar las citas médicas programadas. También muestra indicadores clave de rendimiento (KPI) para que el recepcionista pueda tener una visión general del estado actual del sistema de salud desde su perspectiva.

export default function DashboardRecepcionista() {
  const [nombre, setNombre] = useState<string>('Recepcionista');
  const [rut, setRut] = useState<string>('—');
  const [citas, setCitas] = useState<any[]>([]);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAgendar, setModalAgendar] = useState(false);
  const [medicoSelId, setMedicoSelId] = useState('');
  const [formCita, setFormCita] = useState({ rutPaciente: '', rutMedico: '', fecha: '', hora: '' });
  const [agendarError, setAgendarError] = useState<string | null>(null);
  const [agendarLoading, setAgendarLoading] = useState(false);

  const [modalAsignar, setModalAsignar] = useState<{
    pacienteId: string;
    listaEsperaId: string;
    nombrePaciente: string;
    especialidadId: string;
  } | null>(null);
  const [asignarMedicoRut, setAsignarMedicoRut] = useState('');
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

    fetchDashboard(token);
    fetchMedicos(token);
  }, []);

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${API}/api/recepcionista/dashboard`, {
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

  const fetchMedicos = async (token: string) => {
    try {
      const res = await fetch(`${API}/api/recepcionista/medicos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMedicos(data.medicos ?? []);
    } catch {
      setMedicos([]);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  const getMedicoEspecialidad = (m: Medico): string => {
    const esp = Array.isArray(m.especialidades) ? m.especialidades[0] : m.especialidades;
    return esp?.nombre ?? '';
  };

  const abrirModalAsignar = (entrada: any) => {
    const p = Array.isArray(entrada.pacientes) ? entrada.pacientes[0] : entrada.pacientes;
    const nombrePaciente = p
      ? `${p.nombre} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`.trim()
      : 'Paciente';
    setModalAsignar({
      pacienteId: p?.id,
      listaEsperaId: entrada.id,
      nombrePaciente,
      especialidadId: entrada.especialidad_id ?? '',
    });
    setAsignarMedicoRut('');
    setAsignarFecha('');
    setAsignarHora('');
    setAsignarError(null);
  };

  // handleAsignarCita es una función que se ejecuta cuando el recepcionista confirma la asignación de una cita a un paciente que se encuentra en lista de espera. La función valida que se haya seleccionado un médico, una fecha y una hora, y luego realiza una petición a la API para asignar la cita al paciente. Si la asignación es exitosa, se cierra el modal y se actualiza el dashboard para reflejar los cambios. Si ocurre un error durante el proceso, se muestra un mensaje de error al recepcionista para que pueda tomar las acciones necesarias.

  const handleAsignarCita = async () => {
    if (!asignarMedicoRut) { setAsignarError('Selecciona un médico.'); return; }
    if (!asignarFecha || !asignarHora) { setAsignarError('Selecciona fecha y hora.'); return; }
    if (!modalAsignar) return;
    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    setAsignarLoading(true);
    setAsignarError(null);
    try {
      const res = await fetch(`${API}/api/medico/asignar-cita`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rutMedico: asignarMedicoRut,
          pacienteId: modalAsignar.pacienteId,
          listaEsperaId: modalAsignar.listaEsperaId,
          fecha: asignarFecha,
          hora: asignarHora,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAsignarError(data.error ?? 'Error al asignar.'); return; }
      setModalAsignar(null);
      fetchDashboard(sessionStorage.getItem('access_token')!);
    } catch {
      setAsignarError('Error de conexión.');
    } finally {
      setAsignarLoading(false);
    }
  };

  const abrirModal = () => {
    setMedicoSelId('');
    setFormCita({ rutPaciente: '', rutMedico: '', fecha: '', hora: '' });
    setAgendarError(null);
    setModalAgendar(true);
  };

  const handleSeleccionarMedico = (id: string) => {
    setMedicoSelId(id);
    const m = medicos.find(m => m.id === id);
    setFormCita(f => ({ ...f, rutMedico: m?.rut ?? '' }));
  };

  const handleAgendarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCita.rutPaciente || !medicoSelId || !formCita.fecha || !formCita.hora) {
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
      const res = await fetch(`${API}/api/recepcionista/citas`, {
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
      fetchDashboard(token);
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

  // Cálculo de indicadores clave de rendimiento (KPI) para mostrar en el dashboard del recepcionista. Se cuentan las citas que están confirmadas y las que están asignadas (notificaciones) para proporcionar al recepcionista una visión general del estado actual de las citas médicas programadas y las solicitudes en lista de espera.
  const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length;
  const notificaciones = citas.filter(c => c.estado === 'asignada').length;

  const medicoSeleccionado = medicos.find(m => m.id === medicoSelId);
  const medicosFiltradosAsignar = modalAsignar
    ? medicos.filter(m => m.especialidad_id === modalAsignar.especialidadId)
    : [];

    // El componente devuelve la estructura visual de la página de inicio del recepcionista, que incluye un encabezado con el logo y la información del usuario, un área principal con indicadores clave de rendimiento (KPI) y secciones para mostrar las citas médicas programadas y el estado en las listas de espera. También incluye modales para agendar nuevas citas y asignar médicos a las solicitudes de hora médica en lista de espera, permitiendo al recepcionista gestionar eficientemente las citas médicas desde su perspectiva en el sistema de salud.
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
            <p className={styles.userName}>{nombre}</p>
            <p className={styles.userRut}>RUT: {rut}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.welcomeTitle}>Bienvenido al Portal</h2>
        <p className={styles.welcomeSubtitle}>Gestiona las citas médicas y el estado de las listas de espera de todos los pacientes.</p>

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
            <button className={styles.btnAgendar} onClick={abrirModal}>Agendar nueva cita</button>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Lista de Espera</h3>
            {listaEspera.length === 0 ? (
              <p className={styles.emptyState}>No hay pacientes en lista de espera.</p>
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
                <label className={styles.formLabel}>Médico:</label>
                <select
                  className={styles.formSelect}
                  value={medicoSelId}
                  onChange={e => handleSeleccionarMedico(e.target.value)}
                >
                  <option value="">Selecciona un médico</option>
                  {medicos.map(m => (
                    <option key={m.id} value={m.id}>
                      Dr/a {m.nombre} {m.apellido} — {getMedicoEspecialidad(m)}
                    </option>
                  ))}
                </select>
              </div>
              {medicoSeleccionado && (
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Especialidad:</label>
                  <input className={styles.formInputReadonly} type="text" value={getMedicoEspecialidad(medicoSeleccionado)} readOnly />
                </div>
              )}
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
              <h3 className={styles.modalTitle}>Asignar cita</h3>
              <button type="button" className={styles.modalClose} onClick={() => setModalAsignar(null)}>×</button>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569' }}>
              Paciente: <strong>{modalAsignar.nombrePaciente}</strong>
            </p>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Médico:</label>
              <select
                className={styles.formSelect}
                value={asignarMedicoRut}
                onChange={e => setAsignarMedicoRut(e.target.value)}
              >
                <option value="">Selecciona un médico</option>
                {medicosFiltradosAsignar.map(m => (
                  <option key={m.id} value={m.rut}>
                    Dr/a {m.nombre} {m.apellido}
                  </option>
                ))}
              </select>
            </div>
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

// El componente KpiCard es un componente reutilizable que se utiliza para mostrar indicadores clave de rendimiento (KPI) en el dashboard del recepcionista. Recibe una etiqueta, un valor numérico y una clase de estilo para el valor, y muestra esta información de manera visualmente destacada. Este componente se utiliza para mostrar métricas importantes como el número de citas confirmadas, pacientes en lista de espera y notificaciones, proporcionando al recepcionista una visión rápida del estado actual del sistema de salud desde su perspectiva.

function KpiCard({ label, valor, valueClass }: { label: string; valor: number; valueClass: string }) {
  return (
    <div className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={`${styles.kpiValue} ${valueClass}`}>{valor}</p>
    </div>
  );
}

// El componente CitaItem representa un elemento individual de la lista de citas médicas programadas en el dashboard del recepcionista. Muestra información detallada sobre cada cita, incluyendo el nombre del paciente, su RUT, la especialidad médica, la fecha y hora de la cita, y el lugar donde se llevará a cabo. También muestra un badge que indica el estado de la cita (por confirmar o confirmada). Este componente ayuda al recepcionista a visualizar rápidamente los detalles de cada cita médica programada y gestionar eficientemente las citas desde su perspectiva en el sistema de salud.

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

  // Formateo del nombre completo del paciente, incluyendo el nombre, apellido paterno y apellido materno (si existe). Si no se encuentra información del paciente, se muestra un guión como valor predeterminado. Este formato permite al recepcionista identificar fácilmente al paciente asociado con cada cita médica programada en el dashboard.

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


// El componente ListaItem representa un elemento individual de la lista de espera en el dashboard del recepcionista. Muestra información relevante sobre cada entrada en la lista de espera, incluyendo la especialidad médica, el nombre del paciente (si está disponible), su RUT, y una barra de progreso que indica la posición actual del paciente en la fila de espera en relación con el total de pacientes en esa especialidad. También incluye un botón para asignar una cita al paciente, lo que permite al recepcionista gestionar eficientemente las solicitudes de hora médica en lista de espera desde su perspectiva en el sistema de salud.

function ListaItem({ datos, total, onAsignar }: { datos: any; total: number; onAsignar: (entrada: any) => void }) {
  const especialidad = Array.isArray(datos.especialidades) ? datos.especialidades[0] : datos.especialidades;
  const posicion = datos.posicion_actual_fila ?? 0;
  const porcentaje = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - posicion / total) * 100))) : 0;
  const paciente = Array.isArray(datos.pacientes) ? datos.pacientes[0] : datos.pacientes;
  const nombrePaciente = paciente
    ? `${paciente.nombre} ${paciente.apellido_paterno ?? ''} ${paciente.apellido_materno ?? ''}`.trim()
    : null;

    // Formateo del nombre completo del paciente, incluyendo el nombre, apellido paterno y apellido materno (si existe). Si no se encuentra información del paciente, se muestra null como valor predeterminado. Este formato permite al recepcionista identificar fácilmente al paciente asociado con cada entrada en la lista de espera en el dashboard.

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
        Asignar cita
      </button>
    </div>
  );
}


// El componente CalendarioMini es un componente de calendario compacto que se utiliza en el formulario de agendar cita para que el recepcionista pueda seleccionar la fecha de la cita médica. Permite navegar entre meses y seleccionar un día específico, mostrando visualmente el día seleccionado, el día actual y deshabilitando los días pasados. Este componente facilita al recepcionista la selección de fechas de manera rápida e intuitiva al agendar nuevas citas para los pacientes desde su perspectiva en el sistema de salud.

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

  // El componente devuelve la estructura visual del calendario compacto, que incluye un encabezado con botones para navegar entre meses y el mes y año actual, una cuadrícula que muestra los días de la semana y los días del mes, y estilos visuales para indicar el día seleccionado, el día actual y los días pasados. Este diseño permite al recepcionista seleccionar fácilmente la fecha de la cita médica al agendar nuevas citas para los pacientes desde su perspectiva en el sistema de salud.
  
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
