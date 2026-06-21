'use client';
//implementada por Benjamin Morales
import React from 'react';
import { useRouter } from 'next/navigation';

// Esta página es la página de aterrizaje (landing page) para los usuarios que acceden al portal ciudadano de RedNorte Salud. Proporciona una bienvenida y una breve descripción del portal, e incluye un botón para ingresar con ClaveÚnica, que redirige a los usuarios a la página de autenticación correspondiente. También ofrece un enlace para que el personal de la RedNorte pueda iniciar sesión en su área institucional.
export default function LandingPage() {
  const router = useRouter();

  // El componente devuelve un diseño centrado con un título, una descripción, un mensaje informativo sobre la necesidad de validar la identidad para gestionar citas médicas, un botón para ingresar con ClaveÚnica que redirige a la página de autenticación, y un enlace para que el personal de la RedNorte pueda iniciar sesión en su área institucional.
  return (
    <div style={{ maxWidth: '500px', margin: '150px auto', fontFamily: 'system-ui, sans-serif', padding: '30px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
      <h1 style={{ color: '#0f4c81', fontSize: '28px', marginBottom: '10px' }}>SIG-RedNorte</h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '30px', lineHeight: '1.6' }}>
        Bienvenido al Portal Ciudadano de Confirmación y Monitoreo de Lista de Espera Asistencial.
      </p>

      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '30px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
          Para revisar su lugar en la fila y gestionar sus citas médicas, debe validar su identidad.
        </p>
      </div>

// Botón para ingresar con ClaveÚnica que redirige a la página de autenticación correspondiente.
      <button
        onClick={() => router.push('/auth/claveunica')}
        style={{ width: '100%', padding: '14px', backgroundColor: '#0f4c81', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#0f4c81')}
      >
        Ingresar con ClaveÚnica
      </button>

// Enlace para que el personal de la RedNorte pueda iniciar sesión en su área institucional.
      <p style={{ marginTop: '24px', fontSize: '13px', color: '#94a3b8' }}>
        ¿Eres personal de la RedNorte?{' '}
        <a onClick={() => router.push('/login')} style={{ color: '#0044b1', cursor: 'pointer', textDecoration: 'underline' }}>
          Iniciar sesión institucional
        </a>
      </p>
    </div>
  );
}
