import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@sig-rednorte/database';

// Función auxiliar para normalizar RUTs (remueve puntos, guiones y espacios)
const cleanRutString = (rawRut: string) => {
  return rawRut.trim().replace(/[^0-9kK]/g, '').toLowerCase();
};

export async function POST(request: Request) {
  try {
    const { rut } = await request.json();
    
    if (!rut) {
      return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });
    }

    // 1. Normalizar el RUT recibido desde el formulario
    const normalizedInputRut = cleanRutString(rut);
    
    // 2. Instanciar cliente Supabase con privilegios elevados (Admin)
    const supabaseAdmin = getSupabaseAdmin();

    // 3. CONSULTA EN TABLA PÚBLICA: Buscar al paciente en la base de datos de la RedNorte
    const { data: pacientes, error: dbError } = await supabaseAdmin
      .from('pacientes')
      .select('*');

    if (dbError) {
      return NextResponse.json({ error: `Error al consultar pacientes: ${dbError.message}` }, { status: 500 });
    }

    // Buscar coincidencia normalizando los RUTs
    const ciudadanoValido = pacientes?.find(
      p => cleanRutString(p.rut) === normalizedInputRut
    );

    if (!ciudadanoValido) {
      return NextResponse.json({ 
        error: 'RUT ciudadano no registrado en la base de datos de evaluación de la RedNorte.' 
      }, { status: 404 });
    }

    const expectedPassword = `secret_token_${normalizedInputRut}`;

    // 4. SOLUCIÓN AL TIPO DE DATO: Consultar de forma directa a la tabla auth.users usando el cliente Admin
    // Al hacerlo mediante .from() evitamos las limitaciones de listUsers() y los problemas de métodos en GoTrueAdminApi
    const { data: authUsers, error: findError } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email')
      .eq('email', ciudadanoValido.correo.toLowerCase());

    if (findError) {
      return NextResponse.json({ error: `Error al verificar credenciales de Auth: ${findError.message}` }, { status: 500 });
    }

    // Si la consulta retornó una fila, significa que el usuario ya existe en Auth
    const existingUser = authUsers && authUsers.length > 0 ? authUsers[0] : null;

    // 5. Si el usuario ya existe en Auth, actualizamos sus credenciales y metadatos usando su ID único obtenido
    if (existingUser) {
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: expectedPassword,
          user_metadata: { 
            rut: ciudadanoValido.rut, 
            nombre: ciudadanoValido.nombre,
            apellido_paterno: ciudadanoValido.apellido_paterno,
            apellido_materno: ciudadanoValido.apellido_materno,
            fecha_nacimiento: ciudadanoValido.fecha_nacimiento
          }
        }
      );

      if (updateError) {
        return NextResponse.json({ error: `Error al sincronizar credenciales: ${updateError.message}` }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Usuario existente sincronizado con éxito.',
        user: updatedUser.user
      }, { status: 200 });
    }

    // 6. Si el usuario no existe en Auth, lo creamos directamente mediante la API de administración
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ciudadanoValido.correo,
      email_confirm: true,
      password: expectedPassword,
      user_metadata: { 
        rut: ciudadanoValido.rut, 
        nombre: ciudadanoValido.nombre,
        apellido_paterno: ciudadanoValido.apellido_paterno,
        apellido_materno: ciudadanoValido.apellido_materno,
        fecha_nacimiento: ciudadanoValido.fecha_nacimiento
      }
    });

    if (createError) {
      return NextResponse.json({ error: `Error al registrar en Supabase Auth: ${createError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario nuevo registrado en Auth con éxito.', 
      user: newAuthUser.user
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}