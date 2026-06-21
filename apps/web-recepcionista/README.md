# web-recepcionista

Microservicio de API para el rol de recepcionista dentro del monorepo **sig-rednorte**. Construido con Next.js 14 (App Router), expone los endpoints que permiten gestionar citas, consultar la lista de espera y listar médicos y especialidades.

> Las páginas de frontend se sirven desde una app separada (`apps/frontend`) en el puerto 3010. Este servicio solo provee la capa de API.

## Puerto de desarrollo

```
3021
```

## Tecnologías

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL) via `@sig-rednorte/database`

## Variables de entorno

Crea un archivo `.env.local` en la raíz de esta app con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_URL=
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (bypass RLS, solo servidor) |
| `NEXT_PUBLIC_API_URL` | URL base de la API externa |

## Comandos

```bash
pnpm dev     # Inicia en http://localhost:3021
pnpm build   # Build de producción
pnpm start   # Inicia servidor de producción
```

## Endpoints de API

Todos los endpoints requieren el header:

```
Authorization: Bearer <token>
```

---

### GET `/api/recepcionista/dashboard`

Retorna las citas activas y la lista de espera completa.

**Respuesta 200:**
```json
{
  "citas": [
    {
      "id": "uuid",
      "estado": "asignada | confirmada",
      "paciente": {
        "nombre": "string",
        "apellido_paterno": "string",
        "apellido_materno": "string",
        "rut": "string"
      },
      "agendas": {
        "id": "uuid",
        "fecha_hora_inicio": "2024-01-01T09:00:00",
        "medicos": {
          "nombre": "string",
          "apellido": "string",
          "recintos": { "nombre": "string", "comuna": "string" },
          "especialidades": { "nombre": "string" }
        }
      }
    }
  ],
  "listaEspera": [
    {
      "id": "uuid",
      "posicion_actual_fila": 1,
      "gravedad": "string",
      "especialidades": { "nombre": "string" },
      "pacientes": {
        "id": "uuid",
        "nombre": "string",
        "apellido_paterno": "string",
        "apellido_materno": "string",
        "rut": "string"
      }
    }
  ]
}
```

---

### POST `/api/recepcionista/citas`

Crea una nueva cita asignando un paciente a un médico en una fecha y hora específica.

**Body:**
```json
{
  "rutPaciente": "12345678-9",
  "rutMedico": "98765432-1",
  "fecha": "2024-06-20",
  "hora": "09:30"
}
```

Los RUTs se normalizan automáticamente (se eliminan puntos, guiones y espacios).

**Lógica de agendas:**
- Si ya existe un bloque de agenda disponible para ese médico en esa fecha/hora, se marca como no disponible.
- Si no existe, se crea un nuevo bloque con duración de 30 minutos.

**Respuesta 201:**
```json
{ "success": true, "citaId": "uuid" }
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `Faltan campos obligatorios` |
| 401 | `No autorizado` / `Token inválido` |
| 404 | `Paciente no encontrado con ese RUT` |
| 404 | `Médico no encontrado con ese RUT` |
| 500 | Error interno al crear agenda o cita |

---

### GET `/api/recepcionista/especialidades`

Lista todas las especialidades disponibles, ordenadas alfabéticamente.

**Respuesta 200:**
```json
{
  "especialidades": [
    { "id": "uuid", "nombre": "Cardiología" },
    { "id": "uuid", "nombre": "Pediatría" }
  ]
}
```

---

### GET `/api/recepcionista/medicos`

Lista todos los médicos activos con su especialidad y recinto, ordenados por apellido.

**Respuesta 200:**
```json
{
  "medicos": [
    {
      "id": "uuid",
      "nombre": "string",
      "apellido": "string",
      "rut": "string",
      "especialidades": { "id": "uuid", "nombre": "string" },
      "recintos": { "nombre": "string", "comuna": "string" }
    }
  ]
}
```

---

## CORS

Las rutas API aceptan solicitudes desde `http://localhost:3010` (app de frontend).

Métodos permitidos: `GET`, `POST`, `OPTIONS`

## Estructura del proyecto

```
src/
└── app/
    ├── layout.tsx
    ├── page.tsx                          # Retorna 404
    ├── recepcionista/
    │   └── page.tsx                      # Retorna 404
    └── api/
        └── recepcionista/
            ├── dashboard/route.ts
            ├── citas/route.ts
            ├── especialidades/route.ts
            └── medicos/route.ts
```

## Tablas de Supabase utilizadas

`pacientes` · `medicos` · `especialidades` · `recintos` · `agendas` · `citas` · `lista_espera`
