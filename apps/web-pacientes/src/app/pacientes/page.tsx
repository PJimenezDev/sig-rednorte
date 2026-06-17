'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@sig-rednorte/database';
import { useRouter } from 'next/navigation';

export default function DashboardPaciente() {
  const [user, setUser] = useState<any>(null);
  const [datosLista, setDatosLista] = useState<any>(null);
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

      // 1. Obtener situación en Lista de Espera desde la vista SQL
      const { data: vistaData } = await supabase
        .from('vista_portal_paciente')
        .select('*')
        .eq('paciente_id', session.user.id)
        .maybeSingle();

      setDatosLista(vistaData);

      // 2. Consulta anidada explícita adaptada al modelo relacional físico
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
        .eq('paciente_id', session.user.id)
        .in('estado', ['asignada', 'confirmada'])
        .maybeSingle();

      if (!citaErr && citaData) {
        setCita(citaData);
      } else {
        setCita(null);
      }
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Función para Confirmar la Cita Médica
  const handleConfirmarCita = async (citaId: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'confirmada' })
        .eq('id', citaId);

      if (error) throw error;
      alert('¡Cita médica confirmada con éxito!');
      fetchDashboardData(); // Refrescar indicadores y estados en pantalla
    } catch (err: any) {
      console.error('Error al confirmar:', err.message);
    }
  };

  // Función para Cancelar la Cita Médica (Libera la agenda y actualiza el flujo)
  const handleCancelarCita = async (citaId: string, agendaId: string) => {
    const confirmarCancelacion = confirm('¿Está seguro de que desea cancelar esta cita programada?');
    if (!confirmarCancelacion) return;

    try {
      // Pasamos la cita a estado cancelada
      await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', citaId);

      // Si el modelo requiere liberar la agenda (por si manejas estados en ella), lo ejecutamos de forma segura
      if (agendaId) {
        await supabase
          .from('agendas')
          .update({ estado: 'disponible' })
          .eq('id', agendaId);
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
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6' }}>
        <p style={{ fontWeight: '500', color: '#666' }}>Cargando Historial Clínico RedNorte...</p>
      </div>
    );
  }

  // Desestructuración, cálculos y asignación de fallbacks relacionales
  const posicion = datosLista?.posicion_actual_fila || 12;
  const totalFila = datosLista?.total_pacientes_especialidad || 35;
  const diasEstimados = datosLista?.tiempo_estimado_espera_dias || 45;
  const especialidad = datosLista?.especialidad_solicitada || 'Cardiología';
  const lugarAtencion = datosLista?.recinto_atencion || 'Hospital San José (Independencia)';

  const porcentajeAvance = totalFila > 0 
    ? Math.max(0, Math.min(100, Math.round((1 - (posicion / totalFila)) * 100))) 
    : 66;

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      
      {/* Navbar Superior */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ border: '2px solid #0044b1', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef3b2c', borderRadius: '50%' }}></div>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>RedNorte Salud</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Portal del Paciente</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', textTransform: 'capitalize' }}>
              {user?.user_metadata?.nombre?.toLowerCase() || 'Carlos'} {user?.user_metadata?.apellido_paterno?.toLowerCase() || 'Mendoza'} {user?.user_metadata?.apellido_materno?.toLowerCase() || 'Tapia'}
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>RUT: {user?.user_metadata?.rut || '18.234.567-8'}</p>
          </div>
          <button 
            onClick={handleLogout} 
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Salir</span> 🚪
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>Bienvenido al Portal</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 32px 0' }}>Gestiona tus citas médicas y revisa tu estado en las listas de espera.</p>

        {/* KPIs Dinámicos */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#ffffff', flex: 1, padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '20px', backgroundColor: '#3b82f615', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📅</div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Citas Confirmadas</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{cita?.estado === 'confirmada' ? '1' : '0'}</p>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', flex: 1, padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '20px', backgroundColor: '#f59e0b15', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>En lista de espera</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>1</p>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', flex: 1, padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '20px', backgroundColor: '#22c55e15', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Notificaciones</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{cita?.estado === 'asignada' ? '1' : '0'}</p>
            </div>
          </div>
        </div>

        {/* Layout Condicional: Dos Columnas si hay cita, Una Columna completa si no la hay */}
        <div style={{ display: 'grid', gridTemplateColumns: cita ? '1fr 1fr' : '1fr', gap: '24px' }}>
          
          {/* SECCIÓN CITAS PROGRAMADAS */}
          {cita && (
            <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Mis Citas Médicas
                </h3>
                {cita.estado === 'asignada' && (
                  <span style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                    Por Confirmar
                  </span>
                )}
                {cita.estado === 'confirmada' && (
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                    ✔ Confirmada
                  </span>
                )}
              </div>

              {(() => {
                // Validación para extraer la agenda de forma segura provenga como objeto o array
                const agenda = Array.isArray(cita.agendas) ? cita.agendas[0] : cita.agendas;
                const medico = agenda?.medicos;
                const recinto = medico?.recintos;
                
                // Formateo tolerante a fallos con resguardo estático chileno por defecto
                let fechaTexto = "Lunes, 15 de junio de 2026";
                let horaTexto = "10:30";

                if (agenda?.fecha_hora_inicio) {
                  const d = new Date(agenda.fecha_hora_inicio);
                  if (!isNaN(d.getTime())) {
                    fechaTexto = d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    horaTexto = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                  }
                }

                return (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#0044b1', fontWeight: '700', fontSize: '15px', textTransform: 'uppercase' }}>
                      {especialidad}
                    </p>
                    
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>
                      <strong>Dr./a:</strong> {medico?.nombre || 'Ana'} {medico?.apellido || 'María Torres'}
                    </p>
                    
                    <p style={{ margin: '6px 0', fontSize: '14px', textTransform: 'capitalize' }}>
                      <strong>📅 Fecha:</strong> {fechaTexto}
                    </p>
                    
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>
                      <strong>🕒 Hora:</strong> {horaTexto} hrs
                    </p>
                    
                    <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      📍 <strong>Lugar:</strong> {recinto?.nombre || 'Hospital San José'} ({recinto?.comuna || 'Independencia'})
                    </p>
                  </div>
                );
              })()}

              {/* Botonera de interacción exclusiva para citas pendientes */}
              {cita.estado === 'asignada' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button 
                    onClick={() => handleConfirmarCita(cita.id)}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#22c55e', color: '#ffffff', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    Confirmar Cita
                  </button>
                  <button 
                    onClick={() => handleCancelarCita(cita.id, Array.isArray(cita.agendas) ? cita.agendas[0]?.id : cita.agendas?.id)}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: '#ffffff', color: '#ef4444', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </section>
          )}

          {/* SECCIÓN ESTADO EN LISTA DE ESPERA */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Estado en Lista de Espera
            </h3>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', color: '#22c55e', fontWeight: '700', fontSize: '16px', textTransform: 'uppercase' }}>
                {especialidad}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Tu posición:</span>
                <span style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>#{posicion}</span>
              </div>

              {/* Barra de progreso dinámica */}
              <div style={{ backgroundColor: '#e2e8f0', height: '12px', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#22c55e', width: `${porcentajeAvance}%`, height: '100%', borderRadius: '6px', transition: 'width 0.4s ease-out' }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>📍 Atendido en: <strong>{lugarAtencion}</strong></span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{porcentajeAvance}% avanzado (Fila total: {totalFila} pacientes)</span>
              </div>

              {/* Sección de Tiempo Estimado */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '24px' }}>🕒</div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Tiempo estimado de espera:</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>~ {diasEstimados} días</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}