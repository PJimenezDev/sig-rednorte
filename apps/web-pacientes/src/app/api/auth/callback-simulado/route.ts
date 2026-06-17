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

    const userMetadata = {
      rut: ciudadanoValido.rut,
      nombre: ciudadanoValido.nombre,
      apellido_paterno: ciudadanoValido.apellido_paterno,
      apellido_materno: ciudadanoValido.apellido_materno,
      fecha_nacimiento: ciudadanoValido.fecha_nacimiento
    };

    // 4. Intentar crear el usuario directamente
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ciudadanoValido.correo,
      email_confirm: true,
      password: expectedPassword,
      user_metadata: userMetadata
    });

    if (!createError) {
      return NextResponse.json({
        success: true,
        message: 'Usuario nuevo registrado en Auth con éxito.',
        user: newAuthUser.user
      }, { status: 200 });
    }

    // 5. Si ya existe, buscar su ID via RPC para evitar listUsers (falla en tier gratuito)
    const isAlreadyExists = createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('exist') ||
      createError.status === 422;

    if (!isAlreadyExists) {
      return NextResponse.json({ error: `Error al registrar en Supabase Auth: ${createError.message}` }, { status: 500 });
    }

    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_auth_user_by_email', { user_email: ciudadanoValido.correo });

    if (rpcError || !rpcData || rpcData.length === 0) {
      return NextResponse.json({ error: `Error al localizar usuario existente: ${rpcError?.message ?? 'no encontrado'}` }, { status: 500 });
    }

    const existingUser = rpcData[0];

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: expectedPassword, user_metadata: userMetadata }
    );

    if (updateError) {
      return NextResponse.json({ error: `Error al sincronizar credenciales: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario existente sincronizado con éxito.',
      user: updatedUser.user
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}