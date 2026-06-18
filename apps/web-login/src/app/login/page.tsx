'use client';

import React, { useState } from 'react';
import { supabase } from '@sig-rednorte/database';
import styles from './page.module.css';

const URL_PACIENTES     = process.env.NEXT_PUBLIC_URL_PACIENTES     ?? 'http://localhost:3020';
const URL_RECEPCIONISTA = process.env.NEXT_PUBLIC_URL_RECEPCIONISTA ?? 'http://localhost:3021';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !data.session) {
        setError('Correo o contraseña incorrectos.');
        return;
      }

      const { access_token, refresh_token } = data.session;

      // Detectar rol: si el correo existe en pacientes → paciente, si no → recepcionista
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('correo', email.toLowerCase())
        .maybeSingle();

      const tokenHash = `#access_token=${access_token}&refresh_token=${refresh_token}&token_type=bearer`;

      if (paciente) {
        window.location.href = `${URL_PACIENTES}/pacientes${tokenHash}`;
      } else {
        window.location.href = `${URL_RECEPCIONISTA}/recepcionista${tokenHash}`;
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaveunica = () => {
    window.location.href = `${URL_PACIENTES}/auth/fake-claveunica`;
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

        <button className={styles.btnClaveunica} onClick={handleClaveunica}>
          Ingresar con RUT (ClaveÚnica)
        </button>
      </div>
    </div>
  );
}
