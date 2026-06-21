'use client';

// Página principal del paciente en el portal de RedNorte Salud. Permite a los pacientes ver sus citas médicas programadas, su posición en las listas de espera, y gestionar sus solicitudes de hora médica. El paciente puede confirmar o cancelar sus citas, así como solicitar nuevas horas médicas seleccionando la especialidad y el recinto donde desea ser atendido. La página también muestra indicadores clave de rendimiento (KPI) para que el paciente pueda tener una visión general de su situación actual en el sistema de salud.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// API es la URL base para la API de pacientes. Se obtiene de las variables de entorno, con un valor predeterminado de 'http://localhost:3020' si no se ha definido.
const API = process.env.NEXT_PUBLIC_API_PACIENTES ?? 'http://localhost:3020';

// DashboardPaciente es el componente principal que representa la página de inicio del paciente. Carga los datos del paciente, incluyendo sus citas médicas y su posición en las listas de espera, al montar el componente. Permite al paciente confirmar o cancelar sus citas, así como solicitar nuevas horas médicas. También muestra indicadores clave de rendimiento (KPI) para que el paciente pueda tener una visión general de su situación actual en el sistema de salud.
export default function DashboardPaciente() {
  const [nombre, setNombre] = useState<string>('Paciente');
  const [rut, setRut] = useState<string>('—');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [listaEspera, setListaEspera] = useState<any[]>([]);
  const [citas, setCitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCancelar, setModalCancelar] = useState<{ citaId: string; agendaId: string } | null>(null);
  const [modalCancelarLista, setModalCancelarLista] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [especialidades, setEspecialidades] = useState<{ id: string; nombre: string }[]>([]);
  const [recintos, setRecintos] = useState<{ id: string; nombre: string; comuna: string }[]>([]);
  const [medicoRecintos, setMedicoRecintos] = useState<{ especialidad_id: string; recinto_id: string }[]>([]);
  const [especialidadSel, setEspecialidadSel] = useState('');
  const [recintoSel, setRecintoSel] = useState('');
  const [solicitarLoading, setSolicitarLoading] = useState(false);
  const [solicitarError, setSolicitarError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    const n = sessionStorage.getItem('nombre_usuario');
    if (n) setNombre(n);
    const r = sessionStorage.getItem('rut_usuario');
    if (r) setRut(r);
    setAccessToken(token);

    fetchDashboard(token);
  }, []);

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${API}/api/pacientes/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setListaEspera(data.listaEspera ?? []);
      setCitas(data.citas ?? []);
    } catch {
      console.error('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarCita = async (citaId: string) => {
    if (!accessToken) return;
    await fetch(`${API}/api/citas/${citaId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirmar' }),
    });
    setToast('Cita médica confirmada con éxito.');
    setTimeout(() => setToast(null), 3500);
    fetchDashboard(accessToken);
  };

  const handleSolicitarCancelar = (citaId: string, agendaId: string) => {
    setModalCancelar({ citaId, agendaId });
  };

  const handleConfirmarCancelar = async () => {
    if (!modalCancelar || !accessToken) return;
    await fetch(`${API}/api/citas/${modalCancelar.citaId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancelar', agendaId: modalCancelar.agendaId }),
    });
    setModalCancelar(null);
    fetchDashboard(accessToken);
  };

  const handleCancelarLista = async () => {
    if (!modalCancelarLista || !accessToken) return;
    await fetch(`${API}/api/pacientes/solicitar-hora`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalCancelarLista }),
    });
    setModalCancelarLista(null);
    setToast('Solicitud cancelada correctamente.');
    setTimeout(() => setToast(null), 3500);
    fetchDashboard(accessToken);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  const abrirModalSolicitar = async () => {
    setSolicitarError(null);
    setEspecialidadSel('');
    setRecintoSel('');
    setModalSolicitar(true);
    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/pacientes/solicitar-hora`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEspecialidades(data.especialidades ?? []);
      setRecintos(data.recintos ?? []);
      setMedicoRecintos(data.medicoRecintos ?? []);
    } catch {
      setEspecialidades([]);
      setRecintos([]);
      setMedicoRecintos([]);
    }
  };

  // handleSolicitarHora es una función que se ejecuta cuando el paciente confirma su solicitud de hora médica. Verifica que se haya seleccionado una especialidad y un recinto, y luego realiza una solicitud POST a la API para solicitar la hora médica. Si la solicitud es exitosa, cierra el modal de solicitud y actualiza el dashboard del paciente para reflejar los cambios. Si ocurre un error, muestra un mensaje de error adecuado.
  const handleSolicitarHora = async () => {
    if (!especialidadSel) { setSolicitarError('Selecciona una especialidad.'); return; }
    if (!recintoSel) { setSolicitarError('Selecciona un recinto.'); return; }
    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    setSolicitarLoading(true);
    setSolicitarError(null);
    try {
      const res = await fetch(`${API}/api/pacientes/solicitar-hora`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ especialidadId: especialidadSel, recintoId: recintoSel }),
      });
      const data = await res.json();
      if (!res.ok) { setSolicitarError(data.error ?? 'Error al solicitar.'); return; }
      setModalSolicitar(false);
      fetchDashboard(token);
    } catch {
      setSolicitarError('Error de conexión.');
    } finally {
      setSolicitarLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Cargando Portal RedNorte...</p>
      </div>
    );
  }

  const citasConfirmadas = citas.filter((c: any) => c.estado === 'confirmada').length;
  const notificaciones = citas.filter((c: any) => c.estado === 'asignada').length;

  // El componente devuelve la estructura visual de la página de inicio del paciente, que incluye un encabezado con el logo y la información del usuario, un área principal con indicadores clave de rendimiento (KPI) y secciones para mostrar las citas médicas programadas y el estado en las listas de espera. También incluye modales para confirmar la cancelación de citas y solicitudes, así como un modal para solicitar nuevas horas médicas. Además, muestra mensajes de toast para informar al usuario sobre acciones exitosas o errores durante el proceso.
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
            <p className={styles.userName}>{nombre}</p>
            <p className={styles.userRut}>RUT: {rut}</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.welcomeTitle}>Bienvenido al Portal</h2>
        <p className={styles.welcomeSubtitle}>Gestiona tus citas médicas y revisa tu estado en las listas de espera.</p>

        <div className={styles.kpiGrid}>
          <KpiCard label="Citas Confirmadas" valor={citasConfirmadas} valueClass={styles.kpiValueBlue} />
          <KpiCard label="En lista de espera" valor={listaEspera.length} valueClass={styles.kpiValueAmber} />
          <KpiCard label="Notificaciones" valor={notificaciones} valueClass={styles.kpiValueGreen} />
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Mis Citas Médicas</h3>
            {citas.length > 0 ? (
              <div className={styles.citasList}>
                {citas.map((c: any) => (
                  <CitaCard
                    key={c.id}
                    cita={c}
                    onConfirmar={handleConfirmarCita}
                    onCancelar={handleSolicitarCancelar}
                  />
                ))}
              </div>
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
                  <ListaEsperaCard key={i} datos={entrada} onCancelar={() => setModalCancelarLista(entrada.id)} />
                ))}
              </div>
            )}
            <button className={styles.btnSolicitar} onClick={abrirModalSolicitar}>
              Solicitar hora
            </button>
          </section>
        </div>
      </main>

      {toast && (
        <div className={styles.toast}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {toast}
        </div>
      )}

// Modal para solicitar hora médica, donde el paciente puede seleccionar la especialidad y el recinto donde desea ser atendido. Al confirmar la solicitud, se realiza una petición a la API para registrar la solicitud de hora médica del paciente.
      {modalSolicitar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <p className={styles.modalTitle}>Solicitar hora médica</p>
            <p className={styles.modalText}>Selecciona la especialidad y el recinto donde deseas ser atendido. Un médico de esa especialidad te asignará una fecha.</p>
            <select
              className={styles.modalSelect}
              value={especialidadSel}
              onChange={e => { setEspecialidadSel(e.target.value); setRecintoSel(''); }}
            >
              <option value="">Selecciona especialidad</option>
              {especialidades.map((esp: any) => (
                <option key={esp.id} value={esp.id}>{esp.nombre}</option>
              ))}
            </select>
            <select
              className={styles.modalSelect}
              value={recintoSel}
              onChange={e => setRecintoSel(e.target.value)}
              disabled={!especialidadSel}
            >
              <option value="">{especialidadSel ? 'Selecciona recinto' : 'Primero selecciona especialidad'}</option>
              {recintos
                .filter(r => medicoRecintos.some(mr => mr.especialidad_id === especialidadSel && mr.recinto_id === r.id))
                .map((r: any) => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.comuna}</option>
                ))}
            </select>
            {solicitarError && <p className={styles.modalError}>{solicitarError}</p>}
            <div className={styles.modalBtnGroup}>
              <button className={styles.modalBtnSecondary} onClick={() => setModalSolicitar(false)}>
                Cancelar
              </button>
              <button className={styles.modalBtnPrimary} onClick={handleSolicitarHora} disabled={solicitarLoading}>
                {solicitarLoading ? 'Solicitando...' : 'Solicitar hora'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {modalCancelarLista && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <p className={styles.modalTitle}>Cancelar solicitud</p>
            <p className={styles.modalText}>
              ¿Estás seguro de que deseas cancelar esta solicitud de hora? Serás removido de la lista de espera.
            </p>
            <div className={styles.modalBtnGroup}>
              <button className={styles.modalBtnSecondary} onClick={() => setModalCancelarLista(null)}>
                Volver
              </button>
              <button className={styles.modalBtnDanger} onClick={handleCancelarLista}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KpiCard es un componente que representa una tarjeta de indicador clave de rendimiento (KPI) en el dashboard del paciente. Recibe una etiqueta, un valor numérico y una clase de estilo para el valor. El componente muestra la etiqueta y el valor de manera destacada, utilizando estilos para diferenciar visualmente los diferentes tipos de KPI (por ejemplo, citas confirmadas, pacientes en lista de espera, notificaciones). Este componente se utiliza para proporcionar al paciente una visión rápida y clara de su situación actual en el sistema de salud.

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

  // El componente CitaCard representa una tarjeta de cita médica en el dashboard del paciente. Muestra información relevante sobre la cita, como el nombre del médico, la fecha y hora de la cita, y el lugar donde se realizará. También incluye botones para confirmar o cancelar la cita, dependiendo de su estado actual. Si la cita está en estado "asignada", se muestra un botón para confirmar la cita; si ya está confirmada, se muestra un badge indicando su estado. El botón de cancelar está disponible para ambas situaciones, permitiendo al paciente gestionar sus citas de manera eficiente desde el portal.
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

function ListaEsperaCard({ datos, onCancelar }: { datos: any; onCancelar: () => void }) {
  const posicion = datos?.posicion_actual_fila ?? '—';
  const esp = Array.isArray(datos?.especialidades) ? datos.especialidades[0] : datos?.especialidades;
  const especialidad = esp?.nombre ?? 'Especialidad';
  const recinto = Array.isArray(datos?.recintos) ? datos.recintos[0] : datos?.recintos;

  // El componente ListaEsperaCard representa una tarjeta que muestra la información de una solicitud de hora médica que se encuentra en lista de espera. Muestra la especialidad solicitada, la posición actual del paciente en la fila de espera, y el recinto donde se realizó la solicitud. También incluye un botón para cancelar la solicitud, lo que permitirá al paciente gestionar su participación en las listas de espera de manera eficiente desde el portal.
  return (
    <div className={styles.citaInnerCard}>
      <p className={styles.listaEspecialidad}>{especialidad}</p>

      <div className={styles.positionRow}>
        <span className={styles.positionLabel}>Tu posición en fila:</span>
        <span className={styles.positionNumber}>#{posicion}</span>
      </div>

      {recinto && (
        <p className={styles.citaLocation}>
          <strong>Recinto:</strong> {recinto.nombre}{recinto.comuna ? ` — ${recinto.comuna}` : ''}
        </p>
      )}

      <div className={styles.timeSection}>
        <p className={styles.timeLabel}>Estado:</p>
        <p className={styles.timeValue} style={{ fontSize: '14px', color: '#f59e0b' }}>En espera de asignación</p>
      </div>

      <div className={styles.btnGroup}>
        <button className={styles.btnCancel} onClick={onCancelar}>
          Cancelar solicitud
        </button>
      </div>
    </div>
  );
}
