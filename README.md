# SIG-RedNorte

Sistema Integrado de Gestión para la Red de Salud Norte. MVP.

Permite a pacientes consultar su posición en lista de espera y gestionar citas médicas, y a médicos y recepcionistas administrar agendas y asignaciones.

## Arquitectura

Monorepo con **Turborepo** y **pnpm workspaces**. Compuesto por una app de frontend y cuatro microservicios de API, todos construidos con Next.js 14.

```
sig-rednorte/
├── apps/
│   ├── frontend/          # UI principal          → puerto 3010
│   ├── web-login/         # API de autenticación  → puerto 3022
│   ├── web-pacientes/     # API de pacientes      → puerto 3020
│   ├── web-recepcionista/ # API de recepcionista  → puerto 3021
│   └── web-medico/        # API de médicos        → puerto 3023
└── Packages/
    └── database/          # Cliente Supabase compartido (@sig-rednorte/database)
```

### Diagrama de comunicación

```
                        ┌─────────────────────────┐
                        │     frontend :3010       │
                        │  (Next.js — UI único)    │
                        └──────────┬──────────────┘
                                   │ fetch()
          ┌────────────────────────┼────────────────────────┐
          │                        │                         │
          ▼                        ▼                         ▼
  ┌───────────────┐   ┌────────────────────┐   ┌─────────────────────┐
  │ web-login     │   │  web-pacientes     │   │  web-recepcionista  │
  │   :3022       │   │      :3020         │   │       :3021         │
  └───────┬───────┘   └────────┬───────────┘   └──────────┬──────────┘
          │                    │                            │
          │           ┌────────▼───────────┐               │
          │           │    web-medico      │               │
          │           │      :3023         │               │
          │           └────────┬───────────┘               │
          │                    │                            │
          └────────────────────┼────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Supabase       │
                    │  (PostgreSQL + Auth)│
                    └─────────────────────┘
```

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, CSS Modules |
| Backend (APIs) | Next.js 14 App Router (API Routes) |
| Base de datos | Supabase (PostgreSQL hosteado) |
| Autenticación | Supabase Auth + simulación ClaveÚnica por RUT |
| Monorepo | Turborepo 2.x + pnpm 9 |

## Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- [pnpm](https://pnpm.io/) 9.x (`npm install -g pnpm@9`)

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd sig-rednorte

# Instalar todas las dependencias del monorepo
pnpm install
```

## Variables de entorno

Cada app requiere su propio archivo `.env.local`. Todas comparten las mismas credenciales de Supabase.

Crea `.env.local` en cada directorio indicado:

**`apps/frontend/.env.local`**
```env
NEXT_PUBLIC_API_LOGIN=http://localhost:3022
NEXT_PUBLIC_API_PACIENTES=http://localhost:3020
NEXT_PUBLIC_API_RECEPCIONISTA=http://localhost:3021
NEXT_PUBLIC_API_MEDICO=http://localhost:3023
```

**`apps/web-login/.env.local`**
**`apps/web-pacientes/.env.local`**
**`apps/web-recepcionista/.env.local`**
**`apps/web-medico/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=<url-del-proyecto-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> Las claves de Supabase se obtienen desde el panel del proyecto en [supabase.com](https://supabase.com) → Project Settings → API.

## Comandos

Ejecutados desde la raíz del monorepo:

```bash
pnpm dev      # Inicia todas las apps en paralelo (Turborepo)
pnpm build    # Build de producción de todas las apps
pnpm lint     # Lint de todas las apps
```

Para iniciar solo una app específica:

```bash
pnpm --filter frontend dev
pnpm --filter web-login dev
pnpm --filter web-pacientes dev
pnpm --filter web-recepcionista dev
pnpm --filter web-medico dev
```

## Apps y paquetes

### `apps/frontend` — Interfaz de usuario

La única app con UI. Contiene todas las pantallas del sistema.

| Ruta | Descripción |
|---|---|
| `/` | Landing con accesos a login y ClaveÚnica |
| `/login` | Login institucional (médico y recepcionista) |
| `/auth/claveunica` | Autenticación de pacientes por RUN |
| `/pacientes` | Dashboard del paciente |
| `/medico` | Dashboard del médico |
| `/recepcionista` | Dashboard del recepcionista |

Ver [apps/frontend/README.md](apps/frontend/README.md)

---

### `apps/web-login` — API de autenticación

Valida credenciales contra Supabase Auth y determina el rol del usuario (paciente, médico o recepcionista).

| Endpoint | Descripción |
|---|---|
| `POST /api/auth/login` | Login con email y contraseña |

Ver [apps/web-login/README.md](apps/web-login/README.md)

---

### `apps/web-pacientes` — API de pacientes

Gestión de autenticación ClaveÚnica, citas y lista de espera para pacientes.

| Endpoint | Descripción |
|---|---|
| `POST /api/auth/claveunica` | Autenticación por RUT |
| `GET /api/pacientes/dashboard` | Citas y lista de espera del paciente |
| `GET /api/pacientes/solicitar-hora` | Especialidades y recintos disponibles |
| `POST /api/pacientes/solicitar-hora` | Agregar a lista de espera |
| `DELETE /api/pacientes/solicitar-hora` | Cancelar solicitud |
| `POST /api/citas/[id]` | Confirmar o cancelar cita |

Ver [apps/web-pacientes/README.md](apps/web-pacientes/README.md)

---

### `apps/web-recepcionista` — API de recepcionista

Dashboard y asignación de citas para recepcionistas.

| Endpoint | Descripción |
|---|---|
| `GET /api/recepcionista/dashboard` | Citas y lista de espera |
| `POST /api/recepcionista/citas` | Crear cita directa |
| `GET /api/recepcionista/especialidades` | Listar especialidades |
| `GET /api/recepcionista/medicos` | Listar médicos activos |

Ver [apps/web-recepcionista/README.md](apps/web-recepcionista/README.md)

---

### `apps/web-medico` — API de médicos

Dashboard, asignación de citas desde lista de espera y agendamiento directo para médicos.

| Endpoint | Descripción |
|---|---|
| `GET /api/medico/dashboard` | Citas y lista de espera del médico |
| `GET /api/medico/mi-especialidad` | Especialidad del médico |
| `POST /api/medico/asignar-cita` | Asignar cita desde lista de espera |
| `POST /api/medico/citas` | Crear cita directa |

Ver [apps/web-medico/README.md](apps/web-medico/README.md)

---

### `Packages/database` — Cliente Supabase compartido

Paquete interno `@sig-rednorte/database` que centraliza la conexión a Supabase. Expone tres tipos de cliente: público (browser), autenticado (server) y administrador (bypass RLS).

Ver [Packages/database/README.md](Packages/database/README.md)

## Base de datos

El esquema vive en Supabase. Las tablas principales son:

| Tabla | Descripción |
|---|---|
| `pacientes` | Datos de pacientes registrados |
| `medicos` | Datos de médicos con especialidad y recinto |
| `especialidades` | Catálogo de especialidades médicas |
| `recintos` | Centros de salud con nombre y comuna |
| `agendas` | Bloques de horario de cada médico |
| `citas` | Citas asignadas (estados: asignada, confirmada, cancelada) |
| `lista_espera` | Cola de pacientes esperando atención por especialidad |

## Flujos principales

**Paciente solicita hora:**
1. Se autentica con RUT en `/auth/claveunica`
2. En su dashboard selecciona especialidad y recinto
3. Queda en lista de espera con posición calculada automáticamente

**Médico o recepcionista asigna cita:**
1. Ve la lista de espera de su especialidad en el dashboard
2. Selecciona un paciente y elige fecha/hora
3. Se crea la cita y el paciente sale de la lista de espera

**Paciente gestiona su cita:**
1. Ve sus citas en el dashboard con estado actual
2. Puede confirmar o cancelar — al cancelar el bloque de agenda queda disponible nuevamente
