'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@sig-rednorte/database'; // Importamos el cliente estándar

export default function FakeClaveUnicaPage() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para Accesibilidad
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  
  const router = useRouter();

  // Función para formatear el RUT chileno automáticamente
  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, '');
    if (clean.length === 0) return '';
    let dv = clean.slice(-1).toUpperCase();
    let cuerpo = clean.slice(0, -1);
    if (clean.length === 1) return clean.toUpperCase();
    let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpoFormateado}-${dv}`;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (inputVal.length < rut.length) {
      const cleanBefore = inputVal.replace(/[-.]$/, '');
      setRut(cleanBefore);
    } else {
      setRut(formatRut(inputVal));
    }
  };

  // CORRECCIÓN CRÍTICA DE REDIRECCIÓN Y SESIÓN LOCAL
  const handleSimulatedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Validar y/o registrar en el backend seguro
      const response = await fetch('/api/auth/callback-simulado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falla de autenticación');

      // 2. LOGEARSE LOCALMENTE en el cliente del navegador
      // Limpiamos el RUT para generar la contraseña determinista exacta que usa el backend
      const normalizedInputRut = rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();
      const mockEmail = data.user?.email || `${normalizedInputRut}@rednorte.cl`;

      const { error: localAuthError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: `secret_token_${normalizedInputRut}`,
      });

      if (localAuthError) {
        throw new Error(`Error al sincronizar sesión local: ${localAuthError.message}`);
      }

      // 3. Ahora que el navegador tiene la cookie y el JWT guardado en LocalStorage, redirigimos
      router.push('/pacientes');
      router.refresh(); // Fuerza a Next.js a re-evaluar la ruta privada
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de accesibilidad
  const increaseFont = () => { if (fontSizeMultiplier < 1.4) setFontSizeMultiplier(prev => prev + 0.1); };
  const decreaseFont = () => { if (fontSizeMultiplier > 0.8) setFontSizeMultiplier(prev => prev - 0.1); };

  const themeColors = {
    bg: highContrast ? '#000000' : '#ffffff',
    text: highContrast ? '#ffff00' : '#555555',
    inputBg: highContrast ? '#121212' : '#ffffff',
    inputBorder: highContrast ? '#ffff00' : '#707070',
    inputText: highContrast ? '#ffffff' : '#333333',
    primaryLink: highContrast ? '#00ffff' : '#0044b1',
    btnBg: highContrast ? '#ffff00' : '#9aa5ec',
    btnText: highContrast ? '#000000' : '#ffffff',
  };

  return (
    <div style={{ backgroundColor: themeColors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Open Sans", "Helvetica Neue", sans-serif', padding: '0 20px', transition: 'all 0.2s ease' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '440px', height: '6px', marginTop: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#0044b1' }}></div>
        <div style={{ flex: 1, backgroundColor: highContrast ? '#ffff00' : '#ffffff' }}></div>
        <div style={{ flex: 1, backgroundColor: '#ef3b2c' }}></div>
      </div>

      <div style={{ width: '100%', maxWidth: '440px', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${highContrast ? '#ffff00' : '#0044b1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #ef3b2c' }}></div>
              <div style={{ position: 'absolute', width: '2px', height: '8px', backgroundColor: highContrast ? '#ffff00' : '#0044b1', top: '-4px', transform: 'rotate(25deg)' }}></div>
            </div>
            <span style={{ fontSize: `${24 * fontSizeMultiplier}px`, fontWeight: 'bold', color: themeColors.text, letterSpacing: '-0.5px' }}>
              Clave<span style={{ color: highContrast ? '#ffff00' : '#0044b1' }}>Única</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => setHighContrast(!highContrast)} style={{ width: '32px', height: '32px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'linear-gradient(90deg, #333 50%, #fff 50%)', border: '1px solid #333' }}></div>
            </button>
            <button type="button" onClick={decreaseFont} style={{ height: '32px', padding: '0 8px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', fontSize: '11px', color: '#666', cursor: 'pointer' }}>A-</button>
            <button type="button" onClick={increaseFont} style={{ height: '32px', padding: '0 8px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333', cursor: 'pointer' }}>A+</button>
          </div>
        </div>

        <h2 style={{ fontSize: `${26 * fontSizeMultiplier}px`, fontWeight: '700', color: themeColors.text, textAlign: 'center', marginBottom: '35px', fontFamily: 'serif' }}>
          Portal Ciudadano ClaveÚnica
        </h2>

        <form onSubmit={handleSimulatedLogin}>
          <div style={{ marginBottom: '20px' }}>
            <input type="text" placeholder="Ingresa tu RUN" value={rut} onChange={handleRutChange} required style={{ width: '100%', padding: '14px 16px', border: `2px solid ${themeColors.inputBorder}`, borderRadius: '0px', fontSize: `${16 * fontSizeMultiplier}px`, boxSizing: 'border-box', outline: 'none', backgroundColor: themeColors.inputBg, color: themeColors.inputText }} />
          </div>

          <div style={{ marginBottom: '25px', display: 'flex' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu ClaveÚnica" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ flex: 1, padding: '14px 16px', border: `2px solid ${themeColors.inputBorder}`, borderRight: 'none', borderRadius: '0px', fontSize: `${16 * fontSizeMultiplier}px`, boxSizing: 'border-box', outline: 'none', backgroundColor: themeColors.inputBg, color: themeColors.inputText }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ width: '50px', backgroundColor: highContrast ? '#ffff00' : '#9aa5ec', border: `2px solid ${themeColors.inputBorder}`, borderLeft: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: highContrast ? '#000000' : '#ffffff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '35px' }}>
            <a href="#" style={{ color: themeColors.primaryLink, fontSize: `${15 * fontSizeMultiplier}px`, textDecoration: 'underline', fontWeight: '500' }}>Recupera tu ClaveÚnica</a>
            <a href="#" style={{ color: themeColors.primaryLink, fontSize: `${15 * fontSizeMultiplier}px`, textDecoration: 'underline', fontWeight: '500' }}>Solicita tu ClaveÚnica</a>
          </div>

          {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: `${13 * fontSizeMultiplier}px`, marginBottom: '20px' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: themeColors.btnBg, color: themeColors.btnText, border: highContrast ? '2px solid #ffff00' : 'none', cursor: 'pointer', fontSize: `${16 * fontSizeMultiplier}px`, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '2px', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }}>
            {loading ? 'Validando...' : 'Ingresa'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a href="#" style={{ color: themeColors.primaryLink, fontSize: `${14 * fontSizeMultiplier}px`, textDecoration: 'underline' }}>¿Necesitas ayuda?</a>
        </div>
      </div>
    </div>
  );
}