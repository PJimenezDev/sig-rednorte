'use client';

// Página de autenticación para usuarios que desean ingresar con ClaveÚnica. Permite a los usuarios ingresar su RUN y contraseña de ClaveÚnica, y maneja la autenticación con el backend. Incluye opciones de accesibilidad como ajuste de tamaño de fuente y modo de alto contraste para mejorar la experiencia del usuario. Al autenticarse correctamente, redirige al usuario a la sección de pacientes. También proporciona enlaces para recuperar o solicitar una nueva ClaveÚnica, aunque estos enlaces no tienen funcionalidad implementada en este código.

// implementada por Patricio Jimenez
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// El valor de la variable API se obtiene de la variable de entorno NEXT_PUBLIC_API_PACIENTES, que debe contener la URL base del backend para las operaciones relacionadas con pacientes. Si esta variable no está definida, se utiliza 'http://localhost:3020' como valor predeterminado, lo que es útil para el desarrollo local.
const API = process.env.NEXT_PUBLIC_API_PACIENTES ?? 'http://localhost:3020';

// Función para limpiar el RUN ingresado por el usuario, eliminando espacios, puntos y guiones, y convirtiendo a minúsculas. Esto asegura que el formato del RUN sea consistente antes de enviarlo al backend para autenticación.
const cleanRut = (value: string) => value.trim().replace(/[^0-9kK]/g, '').toLowerCase();

// Función para formatear el RUN ingresado por el usuario, agregando puntos y guiones en el formato estándar chileno. Esto mejora la legibilidad del RUN mientras el usuario lo ingresa, aunque el valor limpio se utiliza para la autenticación.
const formatRut = (value: string) => {
  const clean = value.replace(/[^0-9kK]/g, '');
  if (clean.length === 0) return '';
  const dv = clean.slice(-1).toUpperCase();
  const cuerpo = clean.slice(0, -1);
  if (clean.length === 1) return clean.toUpperCase();
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
};


// Componente principal de la página de autenticación con ClaveÚnica. Maneja el estado del formulario, la lógica de autenticación y la interfaz de usuario. Permite a los usuarios ingresar su RUN y contraseña, y proporciona opciones de accesibilidad para mejorar la experiencia del usuario.

export default function ClaveunicaPage() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const router = useRouter();

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (inputVal.length < rut.length) {
      setRut(inputVal.replace(/[-.]$/, ''));
    } else {
      setRut(formatRut(inputVal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/auth/claveunica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: cleanRut(rut) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falla de autenticación');

      sessionStorage.setItem('access_token', data.access_token);
      sessionStorage.setItem('refresh_token', data.refresh_token);
      const nombreCompleto = [data.nombre, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' ');
      if (nombreCompleto) sessionStorage.setItem('nombre_usuario', nombreCompleto);
      if (data.rut) sessionStorage.setItem('rut_usuario', data.rut);

      router.push('/pacientes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Definición de colores para el modo normal y el modo de alto contraste. Estos colores se utilizan en toda la interfaz para garantizar una buena legibilidad y accesibilidad, especialmente para usuarios con dificultades visuales. El modo de alto contraste utiliza colores brillantes y contrastantes para mejorar la visibilidad del texto y los elementos interactivos.
  const colors = {
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
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Open Sans", "Helvetica Neue", sans-serif', padding: '0 20px' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '440px', height: '6px', marginTop: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#0044b1' }} />
        <div style={{ flex: 1, backgroundColor: highContrast ? '#ffff00' : '#ffffff' }} />
        <div style={{ flex: 1, backgroundColor: '#ef3b2c' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '440px', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: `2px solid ${highContrast ? '#ffff00' : '#0044b1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #ef3b2c' }} />
              <div style={{ position: 'absolute', width: '2px', height: '8px', backgroundColor: highContrast ? '#ffff00' : '#0044b1', top: '-4px', transform: 'rotate(25deg)' }} />
            </div>
            <span style={{ fontSize: `${24 * fontSizeMultiplier}px`, fontWeight: 'bold', color: colors.text, letterSpacing: '-0.5px' }}>
              Clave<span style={{ color: highContrast ? '#ffff00' : '#0044b1' }}>Única</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => setHighContrast(!highContrast)} style={{ width: '32px', height: '32px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'linear-gradient(90deg, #333 50%, #fff 50%)', border: '1px solid #333' }} />
            </button>
            <button type="button" onClick={() => { if (fontSizeMultiplier > 0.8) setFontSizeMultiplier(p => p - 0.1); }} style={{ height: '32px', padding: '0 8px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', fontSize: '11px', color: '#666', cursor: 'pointer' }}>A-</button>
            <button type="button" onClick={() => { if (fontSizeMultiplier < 1.4) setFontSizeMultiplier(p => p + 0.1); }} style={{ height: '32px', padding: '0 8px', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333', cursor: 'pointer' }}>A+</button>
          </div>
        </div>

        <h2 style={{ fontSize: `${26 * fontSizeMultiplier}px`, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: '35px', fontFamily: 'serif' }}>
          Portal Ciudadano ClaveÚnica
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input type="text" placeholder="Ingresa tu RUN" value={rut} onChange={handleRutChange} required style={{ width: '100%', padding: '14px 16px', border: `2px solid ${colors.inputBorder}`, borderRadius: '0px', fontSize: `${16 * fontSizeMultiplier}px`, boxSizing: 'border-box', outline: 'none', backgroundColor: colors.inputBg, color: colors.inputText }} />
          </div>
          
          <div style={{ marginBottom: '25px', display: 'flex' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="Ingresa tu ClaveÚnica" value={password} onChange={e => setPassword(e.target.value)} required style={{ flex: 1, padding: '14px 16px', border: `2px solid ${colors.inputBorder}`, borderRight: 'none', borderRadius: '0px', fontSize: `${16 * fontSizeMultiplier}px`, boxSizing: 'border-box', outline: 'none', backgroundColor: colors.inputBg, color: colors.inputText }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ width: '50px', backgroundColor: highContrast ? '#ffff00' : '#9aa5ec', border: `2px solid ${colors.inputBorder}`, borderLeft: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: highContrast ? '#000000' : '#ffffff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '35px' }}>
            <a href="#" style={{ color: colors.primaryLink, fontSize: `${15 * fontSizeMultiplier}px`, textDecoration: 'underline', fontWeight: '500' }}>Recupera tu ClaveÚnica</a>
            <a href="#" style={{ color: colors.primaryLink, fontSize: `${15 * fontSizeMultiplier}px`, textDecoration: 'underline', fontWeight: '500' }}>Solicita tu ClaveÚnica</a>
          </div>

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: `${13 * fontSizeMultiplier}px`, marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: colors.btnBg, color: colors.btnText, border: highContrast ? '2px solid #ffff00' : 'none', cursor: 'pointer', fontSize: `${16 * fontSizeMultiplier}px`, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '2px', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }}>
            {loading ? 'Validando...' : 'Ingresa'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a href="#" style={{ color: colors.primaryLink, fontSize: `${14 * fontSizeMultiplier}px`, textDecoration: 'underline' }}>¿Necesitas ayuda?</a>
        </div>
      </div>
    </div>
  );
}
