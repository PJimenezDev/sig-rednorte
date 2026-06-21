# @sig-rednorte/database

Paquete compartido del monorepo que centraliza la conexión a la base de datos Supabase (PostgreSQL). Expone tres tipos de cliente según el contexto de uso.

## Tecnologías

- [Supabase](https://supabase.com/) — PostgreSQL como servicio con Auth y RLS integrados
- `@supabase/supabase-js` v2.43.4
- TypeScript

## Instalación

Este paquete es interno del monorepo. Se referencia desde otras apps con:

```json
"@sig-rednorte/database": "workspace:*"
```

## Variables de entorno requeridas

| Variable | Descripción | Requerida en |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Todas las apps |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública | Todas las apps |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de rol de servicio (admin) | Solo backend / API routes |

## Uso

### `supabase` — Cliente estándar (browser)

Respeta las políticas RLS. Usar en el lado del cliente.

```ts
import { supabase } from "@sig-rednorte/database";

const { data, error } = await supabase.from("pacientes").select("*");
```

### `createServerClient(userToken)` — Cliente autenticado (server)

Actúa en nombre del usuario autenticado. Solo usar en API routes.

```ts
import { createServerClient } from "@sig-rednorte/database";

const client = createServerClient(userToken);
const { data } = await client.from("citas").select("*");
```

### `getSupabaseAdmin()` — Cliente administrativo

Bypasea RLS. Solo usar en operaciones de backend seguras (ej: asignación de citas por recepcionista).

```ts
import { getSupabaseAdmin } from "@sig-rednorte/database";

const admin = getSupabaseAdmin();
const { data } = await admin.from("agendas").update({ disponible: false }).eq("id", agendaId);
```

## Esquema de la base de datos

### `pacientes`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `rut` | text | RUT normalizado (sin puntos ni guión) |
| `nombre` | text | |
| `apellido_paterno` | text | |
| `apellido_materno` | text | |
| `correo` | text | En minúsculas |
| `fecha_nacimiento` | date | |

### `medicos`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `rut` | text | RUT normalizado |
| `nombre` | text | |
| `apellido` | text | |
| `correo` | text | En minúsculas |
| `especialidad_id` | UUID (FK) | → `especialidades` |
| `recinto_id` | UUID (FK) | → `recintos` |
| `activo` | boolean | |

### `especialidades`
| Columna | Tipo |
|---|---|
| `id` | UUID (PK) |
| `nombre` | text |

### `recintos`
| Columna | Tipo |
|---|---|
| `id` | UUID (PK) |
| `nombre` | text |
| `comuna` | text |

### `agendas`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `medico_id` | UUID (FK) | → `medicos` |
| `fecha_hora_inicio` | timestamptz | |
| `fecha_hora_fin` | timestamptz | |
| `disponible` | boolean | `true` si el bloque está libre |

### `citas`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `paciente_id` | UUID (FK) | → `pacientes` |
| `agenda_id` | UUID (FK) | → `agendas` |
| `estado` | text | `asignada` \| `confirmada` \| `cancelada` |
| `created_at` | timestamptz | |

### `lista_espera`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `paciente_id` | UUID (FK) | → `pacientes` |
| `especialidad_id` | UUID (FK) | → `especialidades` |
| `recinto_id` | UUID (FK) | → `recintos` |
| `posicion_actual_fila` | integer | |
| `edad_en_ingreso` | integer | |
| `gravedad` | text | Opcional |

## Estructura del paquete

```
Packages/database/
├── package.json
├── tsconfig.json
└── src/
    └── client.ts    # Exporta los tres tipos de cliente
```
