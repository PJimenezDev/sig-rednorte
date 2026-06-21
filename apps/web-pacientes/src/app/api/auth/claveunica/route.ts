import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@sig-rednorte/database';

// Función para limpiar y normalizar el RUT (eliminar puntos, guiones y convertir a minúsculas)

const cleanRut = (rut: string) => rut.trim().replace(/[^0-9kK]/g, '').toLowerCase();

// Ruta API para autenticación con ClaveÚnica. Recibe un RUT, verifica si existe en la base de datos de pacientes, y si es así, crea o actualiza un usuario en Supabase Auth con una contraseña predefinida basada en el RUT. Luego, inicia sesión y devuelve los tokens de acceso junto con la información del paciente.

export async function POST(req: NextRequest) {
  const { rut } = await req.json();
  if (!rut) return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });

  const normalizedRut = cleanRut(rut);
  const admin = getSupabaseAdmin();

  const { data: pacientes } = await admin.from('pacientes').select('*');
  const paciente = pacientes?.find((p: any) => cleanRut(p.rut) === normalizedRut);

  if (!paciente) {
    return NextResponse.json({ error: 'RUT ciudadano no registrado en la base de datos de la RedNorte.' }, { status: 404 });
  }

  // La contraseña esperada es un token secreto seguido del RUT normalizado. Esto es solo para simular la autenticación de ClaveÚnica. En un entorno real, se debería integrar con el sistema de autenticación oficial de ClaveÚnica.

  const expectedPassword = `secret_token_${normalizedRut}`;
  const userMetadata = {
    rut: paciente.rut,
    nombre: paciente.nombre,
    apellido_paterno: paciente.apellido_paterno,
    apellido_materno: paciente.apellido_materno,
    fecha_nacimiento: paciente.fecha_nacimiento,
  };

  // Intentar crear el usuario. Si ya existe, actualizar su contraseña y metadata para asegurar que coincida con la información actualizada del paciente.
  const { error: createError } = await admin.auth.admin.createUser({
    email: paciente.correo,
    email_confirm: true,
    password: expectedPassword,
    user_metadata: userMetadata,
  });

  // Si el error indica que el usuario ya existe, se asume que es el mismo paciente intentando autenticarse nuevamente. En ese caso, se actualiza la contraseña y metadata para mantener la sincronización con la base de datos de pacientes.
  if (createError) {
    const isExisting =
      createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('exist') ||
      (createError as any).status === 422;

      // Si el error no es de usuario ya existente, se devuelve un error genérico.
    if (!isExisting) {
      return NextResponse.json({ error: `Error al registrar usuario: ${createError.message}` }, { status: 500 });
    }

    // Si el usuario ya existe, actualizar su contraseña y metadata para mantener la sincronización con la base de datos de pacientes.

    const { data: rpcData } = await admin.rpc('get_auth_user_by_email', { user_email: paciente.correo });
    if (rpcData?.length > 0) {
      await admin.auth.admin.updateUserById(rpcData[0].id, { password: expectedPassword, user_metadata: userMetadata });
    }
  }

  // Iniciar sesión con el usuario para obtener los tokens de acceso. Esto simula el proceso de autenticación de ClaveÚnica, donde el paciente ingresa su RUT y obtiene un token de acceso para usar en la aplicación.

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: paciente.correo,
    password: expectedPassword,
  });

// Si hay un error al iniciar sesión o no se obtiene una sesión válida, se devuelve un error de autenticación.

  if (signInError || !data.session) {
    return NextResponse.json({ error: 'Error al autenticar con ClaveÚnica' }, { status: 500 });
  }

  // Si la autenticación es exitosa, se devuelve el token de acceso, el token de refresco, el rol del usuario (en este caso, "paciente"), y la información del paciente para que el frontend pueda usarla en la aplicación.

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    role: 'paciente',
    nombre: paciente.nombre,
    apellido_paterno: paciente.apellido_paterno,
    apellido_materno: paciente.apellido_materno,
    rut: paciente.rut,
  });
}

// Función para manejar solicitudes OPTIONS, que son parte del proceso de preflight en CORS. Esto permite que el frontend (que corre en un origen diferente) pueda comunicarse con esta API sin problemas de CORS.

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3010',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
