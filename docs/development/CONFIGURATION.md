# Configuración de entorno

`SCRUM-59` define las variables de entorno necesarias para base de datos,
autenticación, archivos, entorno y URLs internas.

## Archivo local

Usa `.env.example` como plantilla:

```bash
copy .env.example .env
```

Los valores incluidos son placeholders de desarrollo local. No son secretos
reales y no deben copiarse a producción.

Para demo local controlada, usar `.env.demo.example`:

```bash
copy .env.demo.example .env
```

Esa plantilla usa `APP_ENV=demo`, base `sigi_poa_demo`, usuarios ficticios y
códigos públicos de demo.

## Validar configuración

```bash
npm run env:check
```

Si falta una variable requerida, el backend falla con un mensaje que lista las
variables faltantes y pide copiar `.env.example` a `.env`.

## Variables requeridas

| Variable | Uso |
| --- | --- |
| `APP_ENV` | Entorno de ejecución: `development`, `test`, `demo` o `production`. |
| `BACKEND_PORT` | Puerto HTTP del backend. |
| `PUBLIC_APP_URL` | URL pública del frontend. |
| `INTERNAL_API_URL` | URL interna usada para comunicación entre servicios. |
| `DATABASE_URL` | Conexión de base de datos. |
| `POSTGRES_URL` | Conexión Postgres alternativa usada por Vercel/Neon si `DATABASE_URL` no existe. |
| `POSTGRES_PRISMA_URL` | Segunda alternativa de conexión Postgres administrada. |
| `POSTGRES_URL_NON_POOLING` | Alternativa directa sin pool para operaciones administrativas. |
| `ADPEAK_RECOVERY_DATABASE_URL` | Override de recuperación; tiene precedencia y solo debe definirse durante una recuperación controlada. |
| `POSTGRES_SSL_MODE` | TLS del ejecutor de migraciones: `verify-full`, `verify-ca`, `require`, `disable` o `no-verify`. |
| `POSTGRES_SSL_CA` | Certificado CA PEM opcional para verificar PostgreSQL durante migraciones. |
| `POSTGRES_ALLOW_INSECURE_DB` | Permite explícitamente `disable` remoto o `no-verify`; nunca habilitarlo normalmente. |
| `AUTH_SECRET` | Secreto de firma para auth; usar solo placeholders en desarrollo. |
| `AUTH_TOKEN_TTL_MINUTES` | Duración de tokens de autenticación en minutos. |
| `FILE_STORAGE_DRIVER` | Compatibilidad del entorno local; producción persiste evidencia en PostgreSQL. |
| `FILE_STORAGE_PATH` | Ruta de archivos del modo local heredado. |
| `EVIDENCE_MAX_FILE_MB` | Límite local de tamaño para evidencias. |
| `SIGI_DATA_FILE` | Fallback JSON para desarrollo sin PostgreSQL; no usar en Vercel. |
| `CORS_ORIGIN` | Origen permitido para llamadas desde frontend. |
| `VITE_API_URL` | URL pública del backend para el frontend. |
| `VITE_API_BASE_URL` | URL base de API versionada para clientes frontend. |
| `INITIAL_DIRECTOR_PASSWORD` | Contraseña temporal inicial del Director. |
| `INITIAL_RESPONSABLE_PASSWORD` | Contraseña temporal inicial de responsables. |
| `INITIAL_PLANTEL_PASSWORD` | Contraseña temporal inicial de planteles. |
| `OFFICIAL_FACTORY_RESET_VERSION` | Marcador único que rehidrata el estado oficial vacío. |
| `OFFICIAL_CREDENTIAL_RESET_VERSION` | Marcador único para restablecer credenciales iniciales. |

El frontend acepta `?api=https://host-del-backend` únicamente cuando el origen
coincide con el mismo sitio o con una URL publicada en la configuración. Un
origen arbitrario no puede redirigir credenciales ni solicitudes.

En despliegues Vercel con Neon, backend y migraciones resuelven en orden
`ADPEAK_RECOVERY_DATABASE_URL`, `DATABASE_URL`, `POSTGRES_URL`,
`POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING`. El override de recuperación
debe permanecer vacío en operación normal. `GET /health` muestra el tipo de
persistencia sin exponer credenciales.

El ejecutor de migraciones verifica certificados TLS de hosts remotos por
defecto. `POSTGRES_SSL_MODE=disable` se acepta automáticamente solo en loopback;
`no-verify` o TLS remoto deshabilitado requieren además
`POSTGRES_ALLOW_INSECURE_DB=true`. Las migraciones cuyo nombre contiene
`_demo_` se excluyen salvo que `APP_ENV=demo`.

## Manejo de secretos y evidencias

- `.env` y `.env.*` están ignorados por Git, excepto `.env.example`.
- `.env.demo.example` también está permitido porque no contiene secretos reales.
- `uploads/`, `evidence/`, `source-materials/`, `private/` y formatos de
  evidencia/documentos fuente están ignorados por Git.
- No se deben versionar credenciales, archivos fuente confidenciales,
  evidencias reales ni datos personales.
- En producción, `AUTH_SECRET` no puede usar valores de ejemplo como
  `local`, `example`, `placeholder` o `change-me`.
- Producción debe usar PostgreSQL. `app_state` conserva el estado de dominio y
  `app_evidence` el contenido binario validado por checksum.
- `SIGI_DATA_FILE` solo debe apuntar a una ruta escribible en desarrollo local.
