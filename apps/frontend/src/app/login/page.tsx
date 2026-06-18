'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const API_LOGIN = process.env.NEXT_PUBLIC_API_LOGIN ?? 'http://localhost:3022';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
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

      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', refresh_token);
      const nombreCompleto = [nombre, apellido ?? apellido_paterno, apellido_materno].filter(Boolean).join(' ');
      if (nombreCompleto) sessionStorage.setItem('nombre_usuario', nombreCompleto);
      if (rut) sessionStorage.setItem('rut_usuario', rut);

      if (role === 'paciente') {
        router.push('/pacientes');
      } else {
        router.push('/recepcionista');
      }
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
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
