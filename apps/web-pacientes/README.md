# web-pacientes

Microservicio de API para el rol de paciente dentro del monorepo **sig-rednorte**. Construido con Next.js 14 (App Router), expone los endpoints que permiten autenticar pacientes, consultar el dashboard, solicitar horas en lista de espera y gestionar citas.

> Las páginas de frontend se sirven desde una app separada (`apps/frontend`) en el puerto 3010. Este servicio solo provee la capa de API.

## Puerto de desarrollo

```
3020
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
pnpm dev     # Inicia en http://localhost:3020
pnpm build   # Build de producción
pnpm start   # Inicia servidor de producción
```

## Endpoints de API

Los endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

---

### POST `/api/auth/claveunica`

Autentica un paciente por RUT (simulación de ClaveÚnica). Si el paciente existe en la base de datos, crea o actualiza su usuario en Supabase Auth y retorna un token de sesión.

**Body:**
```json
{
  "rut": "12345678-9"
}
```

El RUT se normaliza automáticamente (se eliminan puntos, guiones y se convierte la K a minúscula).

**Respuesta 200:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "role": "paciente",
  "nombre": "string",
  "apellido_paterno": "string",
  "apellido_materno": "string",
  "rut": "string"
}
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `RUT requerido` |
| 404 | `RUT no registrado` |
| 500 | Error al registrar o autenticar |

---

### GET `/api/pacientes/dashboard`

Retorna las citas activas y la posición en lista de espera del paciente autenticado.

**Respuesta 200:**
```json
{
  "listaEspera": [
    {
      "id": "uuid",
      "posicion_actual_fila": 3,
      "especialidades": { "nombre": "Cardiología" },
      "recintos": { "nombre": "CESFAM Norte", "comuna": "Quilicura" }
    }
  ],
  "citas": [
    {
      "id": "uuid",
      "estado": "asignada | confirmada",
      "agendas": {
        "id": "uuid",
        "fecha_hora_inicio": "2024-06-20T09:00:00",
        "medicos": {
          "nombre": "string",
          "apellido": "string",
          "recintos": { "nombre": "string", "comuna": "string" }
        }
      }
    }
  ]
}
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 401 | `No autorizado` / `Token inválido` |
| 404 | `Paciente no encontrado` |

---

### GET `/api/pacientes/solicitar-hora`

Retorna las especialidades, recintos y combinaciones médico-recinto disponibles para solicitar una hora.

**Respuesta 200:**
```json
{
  "especialidades": [
    { "id": "uuid", "nombre": "string" }
  ],
  "recintos": [
    { "id": "uuid", "nombre": "string", "comuna": "string" }
  ],
  "medicoRecintos": [
    { "especialidad_id": "uuid", "recinto_id": "uuid" }
  ]
}
```

---

### POST `/api/pacientes/solicitar-hora`

Agrega al paciente autenticado a la lista de espera para una especialidad en un recinto específico.

**Body:**
```json
{
  "especialidadId": "uuid",
  "recintoId": "uuid"
}
```

La posición en fila y la edad de ingreso se calculan automáticamente.

**Respuesta 200:**
```json
{ "success": true }
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `especialidad_id o recinto_id no proporcionados` |
| 401 | `Token inválido` |
| 404 | `Paciente no encontrado` |
| 409 | `Ya existe solicitud activa para esta especialidad` |
| 500 | Error en la inserción |

---

### DELETE `/api/pacientes/solicitar-hora`

Elimina la solicitud del paciente de la lista de espera.

**Body:**
```json
{
  "id": "uuid"
}
```

**Respuesta 200:**
```json
{ "success": true }
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 400 | `ID requerido` |
| 401 | `Token inválido` |
| 404 | `Paciente no encontrado` |

---

### POST `/api/citas/[id]`

Confirma o cancela una cita del paciente. Al cancelar, libera el bloque de agenda correspondiente.

**Parámetro URL:** `id` — ID de la cita.

**Body:**
```json
{
  "action": "confirmar | cancelar",
  "agendaId": "uuid"
}
```

`agendaId` es requerido solo cuando `action` es `"cancelar"`.

**Respuesta 200:**
```json
{ "success": true }
```

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 401 | `No autorizado` |

---

## CORS

Las rutas API aceptan solicitudes desde `http://localhost:3010` (app de frontend).

Métodos permitidos: `GET`, `POST`, `DELETE`, `OPTIONS`

## Estructura del proyecto

```
src/
└── app/
    ├── layout.tsx
    ├── page.tsx                              # Retorna 404
    ├── auth/
    │   └── fake-claveunica/
    │       └── page.tsx                      # Retorna 404
    ├── pacientes/
    │   └── page.tsx                          # Retorna 404
    └── api/
        ├── auth/
        │   └── claveunica/route.ts
        ├── citas/
        │   └── [id]/route.ts
        └── pacientes/
            ├── dashboard/route.ts
            └── solicitar-hora/route.ts
```

## Tablas de Supabase utilizadas

`pacientes` · `citas` · `lista_espera` · `agendas` · `medicos` · `especialidades` · `recintos`
