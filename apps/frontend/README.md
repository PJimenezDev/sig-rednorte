# frontend

Aplicación web principal del monorepo **sig-rednorte**. Es la única app con interfaz de usuario: contiene las páginas de login, los dashboards de paciente, médico y recepcionista, y la pantalla de autenticación ClaveÚnica. Consume los microservicios del monorepo vía Fetch API.

## Puerto de desarrollo

```
3010
```

## Tecnologías

- Next.js 14.2.3 (App Router, Client-Side Rendering)
- TypeScript
- CSS Modules (sin frameworks UI externos)
- Fetch API nativa (sin axios ni librerías HTTP)

## Variables de entorno

Crea un archivo `.env.local` en la raíz de esta app con las siguientes variables:

```env
NEXT_PUBLIC_API_LOGIN=http://localhost:3022
NEXT_PUBLIC_API_PACIENTES=http://localhost:3020
NEXT_PUBLIC_API_RECEPCIONISTA=http://localhost:3021
NEXT_PUBLIC_API_MEDICO=http://localhost:3023
```

| Variable | Microservicio al que apunta |
|---|---|
| `NEXT_PUBLIC_API_LOGIN` | web-login (autenticación) |
| `NEXT_PUBLIC_API_PACIENTES` | web-pacientes |
| `NEXT_PUBLIC_API_RECEPCIONISTA` | web-recepcionista |
| `NEXT_PUBLIC_API_MEDICO` | web-medico |

## Comandos

```bash
pnpm dev     # Inicia en http://localhost:3010
pnpm build   # Build de producción
pnpm start   # Inicia servidor de producción en puerto 3010
```

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing page con accesos a login y ClaveÚnica |
| `/login` | Login institucional (médicos y recepcionistas) |
| `/auth/claveunica` | Autenticación de pacientes por RUN |
| `/pacientes` | Dashboard del paciente |
| `/medico` | Dashboard del médico |
| `/recepcionista` | Dashboard del recepcionista |

---

## Páginas

### `/` — Landing

Página estática con dos accesos: "Ingresar con ClaveÚnica" y "Iniciar sesión institucional".

---

### `/login` — Login institucional

Formulario de email y contraseña para médicos y recepcionistas. Consume `POST /api/auth/login` en `web-login` y redirige según el rol recibido:

| Rol recibido | Redirección |
|---|---|
| `paciente` | `/pacientes` |
| `medico` | `/medico` |
| `recepcionista` | `/recepcionista` |

Los tokens y datos del usuario se guardan en `sessionStorage`.

---

### `/auth/claveunica` — Login ClaveÚnica

Pantalla de autenticación para pacientes. Simula el portal de ClaveÚnica con:

- Formateo automático del RUN (XX.XXX.XXX-K)
- Controles de accesibilidad: contraste alto y ajuste de tamaño de fuente
- Consume `POST /api/auth/claveunica` en `web-pacientes`
- Redirige siempre a `/pacientes`

---

### `/pacientes` — Dashboard paciente

Requiere `access_token` en `sessionStorage`. Redirige a `/login` si no existe.

**Secciones:**
- KPIs: citas confirmadas, posición en lista de espera, notificaciones
- **Mis Citas Médicas**: lista de citas con estado, médico, fecha/hora y ubicación. Permite confirmar o cancelar cada cita
- **Lista de Espera**: solicitudes activas con posición en fila y especialidad. Permite cancelar una solicitud o agregar una nueva

**Flujo "Solicitar hora":**
1. Carga especialidades, recintos y combinaciones médico-recinto disponibles
2. El paciente selecciona especialidad y recinto
3. Se agrega a la lista de espera vía `POST /api/pacientes/solicitar-hora`

**APIs consumidas:**

| Método | Endpoint | Acción |
|---|---|---|
| GET | `/api/pacientes/dashboard` | Cargar citas y lista de espera |
| GET | `/api/pacientes/solicitar-hora` | Cargar opciones del formulario |
| POST | `/api/pacientes/solicitar-hora` | Agregar a lista de espera |
| DELETE | `/api/pacientes/solicitar-hora` | Cancelar solicitud |
| POST | `/api/citas/{id}` | Confirmar o cancelar cita |

---

### `/medico` — Dashboard médico

Requiere `access_token` y `rut_usuario` en `sessionStorage`.

**Secciones:**
- KPIs: citas confirmadas, pacientes en lista de espera, notificaciones
- **Mis Citas Médicas**: citas del médico con estado, nombre del paciente, RUT, fecha/hora y ubicación. Incluye botón "Agendar nueva cita"
- **Lista de Espera**: pacientes en espera correspondientes a la especialidad del médico. Cada fila tiene un botón "Asignarme esta cita"

**Modal "Agendar nueva cita":** permite crear una cita directa ingresando el RUT del paciente, fecha y hora. Valida que el RUT tenga el formato correcto (XX.XXX.XXX-X).

**Modal "Asignar cita":** toma el paciente seleccionado de la lista de espera y solicita fecha y hora. Incluye un `CalendarioMini` interactivo para seleccionar la fecha con navegación por mes.

**APIs consumidas:**

| Método | Endpoint | Acción |
|---|---|---|
| GET | `/api/medico/dashboard?rut=` | Cargar citas y lista de espera |
| GET | `/api/medico/mi-especialidad?rut=` | Obtener especialidad del médico |
| POST | `/api/medico/citas` | Agendar cita directa |
| POST | `/api/medico/asignar-cita` | Asignar cita desde lista de espera |

---

### `/recepcionista` — Dashboard recepcionista

Requiere `access_token` en `sessionStorage`. Funciona igual al dashboard del médico pero con acceso a todos los médicos activos.

**Diferencias respecto al médico:**
- "Agendar nueva cita" incluye un selector de médico con todos los médicos activos del sistema
- "Asignar cita" permite elegir el médico al que se asignará al paciente en espera

**APIs consumidas:**

| Método | Endpoint | Acción |
|---|---|---|
| GET | `/api/recepcionista/dashboard` | Cargar citas y lista de espera |
| GET | `/api/recepcionista/medicos` | Listar médicos activos |
| POST | `/api/recepcionista/citas` | Agendar cita directa |
| POST | `/api/medico/asignar-cita` | Asignar cita desde lista de espera |

---

## Autenticación

Todas las páginas protegidas verifican el token al montar el componente:

```ts
const token = sessionStorage.getItem('access_token');
if (!token) router.push('/login');
```

El cierre de sesión limpia `sessionStorage` y redirige a `/login`.

**Datos almacenados en `sessionStorage`:**

| Clave | Descripción |
|---|---|
| `access_token` | JWT de Supabase Auth |
| `refresh_token` | Token de refresco |
| `nombre_usuario` | Nombre completo del usuario |
| `rut_usuario` | RUT del usuario (médico / recepcionista) |

## Estructura del proyecto

```
src/
└── app/
    ├── layout.tsx
    ├── page.tsx                    # Landing
    ├── login/
    │   ├── page.tsx
    │   └── page.module.css
    ├── auth/
    │   └── claveunica/
    │       └── page.tsx
    ├── pacientes/
    │   ├── page.tsx
    │   └── page.module.css
    ├── medico/
    │   ├── page.tsx
    │   └── page.module.css
    └── recepcionista/
        ├── page.tsx
        └── page.module.css
```

Los componentes internos (`CitaCard`, `ListaItem`, `CalendarioMini`, `KpiCard`) están definidos dentro del archivo de su página correspondiente.
