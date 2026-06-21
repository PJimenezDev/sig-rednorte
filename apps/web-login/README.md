# web-login

Microservicio de autenticación del monorepo **sig-rednorte**. Recibe email y contraseña, valida contra Supabase Auth y determina automáticamente el rol del usuario (paciente, médico o recepcionista) consultando las tablas de la base de datos.

> Las páginas de frontend se sirven desde una app separada (`apps/frontend`) en el puerto 3010. Este servicio solo provee la capa de API.

## Puerto de desarrollo

```
3022
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
NEXT_PUBLIC_URL_PACIENTES=http://localhost:3020
NEXT_PUBLIC_URL_RECEPCIONISTA=http://localhost:3021
NEXT_PUBLIC_API_URL=http://localhost:3030
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (bypass RLS, solo servidor) |
| `NEXT_PUBLIC_URL_PACIENTES` | URL del microservicio de pacientes |
| `NEXT_PUBLIC_URL_RECEPCIONISTA` | URL del microservicio de recepcionista |
| `NEXT_PUBLIC_API_URL` | URL de la API central |

## Comandos

```bash
pnpm dev     # Inicia en http://localhost:3022
pnpm build   # Build de producción
pnpm start   # Inicia servidor de producción
```

## Endpoints de API

### POST `/api/auth/login`

Autentica un usuario con email y contraseña. Determina el rol automáticamente buscando el correo primero en `pacientes`, luego en `medicos`. Si no se encuentra en ninguna, asume rol `recepcionista`.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta 200 — Paciente:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "role": "paciente",
  "nombre": "string",
  "apellido_paterno": "string",
  "apellido_materno": "string"
}
```

**Respuesta 200 — Médico:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "role": "medico",
  "nombre": "string",
  "apellido": "string",
  "rut": "string"
}
```

**Respuesta 200 — Recepcionista:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "role": "recepcionista",
  "nombre": "string",
  "apellido": "string",
  "rut": "string"
}
```

Para médico y recepcionista, los campos `nombre`, `apellido` y `rut` se obtienen desde la tabla correspondiente o desde los metadatos del usuario en Supabase Auth como fallback.

**Errores posibles:**

| Código | Mensaje |
|---|---|
| 401 | `Credenciales incorrectas` |

---

## Lógica de detección de rol

```
email + password
      │
      ▼
Supabase Auth (signInWithPassword)
      │
      ├─ Error → 401
      │
      ▼
Busca correo en tabla `pacientes`
      │
      ├─ Encontrado → role: "paciente"
      │
      ▼
Busca correo en tabla `medicos`
      │
      ├─ Encontrado → role: "medico"
      │
      └─ No encontrado → role: "recepcionista"
```

## CORS

Las rutas API aceptan solicitudes desde `http://localhost:3010` (app de frontend).

Métodos permitidos: `GET`, `POST`, `OPTIONS`

## Estructura del proyecto

```
src/
└── app/
    ├── layout.tsx
    ├── page.tsx              # Retorna 404
    ├── login/
    │   └── page.tsx          # Retorna 404
    └── api/
        └── auth/
            └── login/
                └── route.ts
```

## Tablas de Supabase utilizadas

`pacientes` · `medicos`
