'use client';

//implementada por Benjamin Morales

// Página de inicio de sesión para el sistema de gestión de RedNorte Salud
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// API_LOGIN es la URL base para la API de autenticación. Se obtiene de las variables de entorno, con un valor predeterminado de 'http://localhost:3022' si no se ha definido.
const API_LOGIN = process.env.NEXT_PUBLIC_API_LOGIN ?? 'http://localhost:3022';


// LoginPage es un componente de React que representa la página de inicio de sesión. Permite a los usuarios ingresar su correo electrónico y contraseña para autenticarse. Al enviar el formulario, se realiza una solicitud POST a la API de autenticación para verificar las credenciales. Si la autenticación es exitosa, se almacenan los tokens de acceso y actualización en sessionStorage, junto con información adicional del usuario, y se redirige al usuario a la página correspondiente según su rol (paciente, médico o recepcionista). Si ocurre un error durante el proceso, se muestra un mensaje de error al usuario.
export default function LoginPage() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [mostrarPassword, setMostrar] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_LOGIN}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError('Correo o contraseña incorrectos.');
        return;
      }

      const { access_token, refresh_token, role, nombre, apellido, apellido_paterno, apellido_materno, rut } = await res.json();

      // Almacenar los tokens de acceso y actualización en sessionStorage, junto con información adicional del usuario, y redirigir al usuario a la página correspondiente según su rol (paciente, médico o recepcionista).
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', refresh_token);
      const nombreCompleto = [nombre, apellido ?? apellido_paterno, apellido_materno].filter(Boolean).join(' ');
      if (nombreCompleto) sessionStorage.setItem('nombre_usuario', nombreCompleto);
      if (rut) sessionStorage.setItem('rut_usuario', rut);

      if (role === 'paciente') {
        router.push('/pacientes');
      } else if (role === 'medico') {
        router.push('/medico');
      } else {
        router.push('/recepcionista');
      }
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // El componente devuelve un formulario de inicio de sesión con campos para correo electrónico y contraseña, un botón para mostrar u ocultar la contraseña, y un botón para enviar el formulario. También incluye un enlace para ingresar con RUT (ClaveÚnica) y muestra mensajes de error si las credenciales son incorrectas o si ocurre un error inesperado durante el proceso de autenticación.
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoCircle}>
            <div className={styles.logoDot} />
          </div>
          <div>
            <p className={styles.logoTitle}>RedNorte Salud</p>
            <p className={styles.logoSubtitle}>Sistema Integrado de Gestión</p>
          </div>
        </div>

        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.subtitle}>Ingresa con tu cuenta institucional</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleLogin}>
          <div className={styles.field}>
            <label className={styles.label}>Correo electrónico</label>
            <input
              className={styles.input}
              type="email"
              placeholder="correo@rednorte.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.inputWithIcon}
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setMostrar(v => !v)}
                tabIndex={-1}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className={styles.btnSubmit} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className={styles.divider}>o si eres paciente</div>

        <button className={styles.btnClaveunica} onClick={() => router.push('/auth/claveunica')}>
          Ingresar con RUT (ClaveÚnica)
        </button>
      </div>
    </div>
  );
}
