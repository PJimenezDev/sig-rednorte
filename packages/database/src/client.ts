import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno esenciales de Supabase.');
}

// Cliente estándar para la interfaz (Respeta RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo con bypass de RLS (Para simular ClaveÚnica en el servidor)
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