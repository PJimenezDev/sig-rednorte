import { createClient } from '@supabase/supabase-js';
// Carga de variables de entorno desde Vercel (NEXT_PUBLIC_ para el cliente, sin NEXT_PUBLIC_ para el servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validación de variables de entorno esenciales
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno esenciales de Supabase.');
}

// Cliente estándar para auth en el browser (respeta RLS, anon key es pública por diseño)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente server-side: crea un cliente que actúa como el usuario autenticado (solo usar en API routes)
export function createServerClient(userToken: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Cliente administrativo con bypass de RLS (Para simular ClaveÚnica en el backend, solo usar en API routes seguras)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de Vercel/Server.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};