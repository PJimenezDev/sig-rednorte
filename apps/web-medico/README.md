# web-medico

Microservicio de API para el rol de médico dentro del monorepo **sig-rednorte**. Construido con Next.js 14 (App Router), expone los endpoints que permiten al médico consultar su dashboard, ver su lista de espera, asignar citas y registrar atenciones.

> Las páginas de frontend se sirven desde una app separada (`apps/frontend`) en el puerto 3010. Este servicio solo provee la capa de API.

## Puerto de desarrollo

```
3023
```

## Tecnologías

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth) via `@sig-rednorte/database`

## Variables de entorno

Crea un archivo `.env.local` en la raíz de esta app con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (bypass RLS, solo servidor) |

## Comandos

```bash
pnpm dev     # Inicia en http://localhost:3023
pnpm build   # Build de producción
pnpm start   # Inicia servidor de producción
```

## Endpoints de API

Todos los endpoints requieren el header:

```
Authorization: Bearer <token>
```

Los RUTs se normalizan automáticamente en todos los endpoints (se eliminan puntos, guiones y espacios).

---

### GET `/api/medico/dashboard`

Retorna las citas activas del médico y la lista de espera de su especialidad.

**Query params:**

```
?rut=12345678k
```

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
        "fecha_hora_inicio": "2024-06-20T09:00:00",
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

La lista de espera filtra solo los pacientes que corresponden a la especialidad del médico autenticado, ordenados por posición en fila.

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `RUT requerido` |
| 401 | `No autorizado` / `Token inválido` |
| 404 | `Médico no encontrado` |

---

### GET `/api/medico/mi-especialidad`

Retorna la especialidad del médico identificado por RUT.

**Query params:**

```
?rut=12345678k
```

**Respuesta 200:**
```json
{
  "especialidad": {
    "id": "uuid",
    "nombre": "Cardiología"
  }
}
```

Retorna `null` en el campo `especialidad` si el médico no tiene especialidad asignada.

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `RUT requerido` |
| 401 | `No autorizado` / `Token inválido` |
| 404 | `Médico no encontrado` |

---

### POST `/api/medico/asignar-cita`

Asigna una cita a un paciente desde la lista de espera. Crea un nuevo bloque de agenda, genera la cita y elimina al paciente de la lista de espera.

**Body:**
```json
{
  "rutMedico": "12345678-9",
  "pacienteId": "uuid",
  "listaEsperaId": "uuid",
  "fecha": "2024-06-20",
  "hora": "09:30"
}
```

**Lógica:**
1. Busca al médico por RUT en la tabla `medicos`.
2. Crea un bloque en `agendas` con duración de 30 minutos y `disponible: false`.
3. Crea la cita en `citas` con estado `"asignada"`.
4. Elimina el registro de `lista_espera` correspondiente a `listaEsperaId`.

**Respuesta 201:**
```json
{ "success": true }
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `Faltan campos obligatorios` |
| 401 | `No autorizado` / `Token inválido` |
| 404 | `Médico no encontrado` |
| 500 | Error al crear agenda o cita |

---

### POST `/api/medico/citas`

Crea una cita directa entre un paciente y un médico por RUT, sin pasar por la lista de espera. Reutiliza un bloque de agenda disponible si existe, o crea uno nuevo.

**Body:**
```json
{
  "rutPaciente": "98765432-1",
  "rutMedico": "12345678-9",
  "fecha": "2024-06-20",
  "hora": "10:00"
}
```

**Lógica:**
1. Busca paciente y médico por RUT.
2. Verifica si existe un bloque disponible en `agendas` para ese médico en esa fecha/hora.
   - Si existe: lo marca como `disponible: false`.
   - Si no existe: crea un nuevo bloque con duración de 30 minutos.
3. Crea la cita en `citas` con estado `"asignada"`.

**Respuesta 200:**
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
| 500 | Error al crear agenda o cita |

---

## CORS

Las rutas API aceptan solicitudes desde `http://localhost:3010` (app de frontend).

Métodos permitidos: `GET`, `POST`, `DELETE`, `OPTIONS`

## Estructura del proyecto

```
src/
└── app/
    ├── layout.tsx
    ├── page.tsx                              # Retorna null
    └── api/
        └── medico/
            ├── dashboard/route.ts
            ├── mi-especialidad/route.ts
            ├── asignar-cita/route.ts
            └── citas/route.ts
```

## Tablas de Supabase utilizadas

`medicos` · `pacientes` · `agendas` · `citas` · `lista_espera` · `especialidades` · `recintos`
