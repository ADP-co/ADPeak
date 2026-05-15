# Configuracion de entorno

`SCRUM-59` define las variables de entorno necesarias para base de datos,
autenticacion, archivos, entorno y URLs internas.

## Archivo local

Usa `.env.example` como plantilla:

```bash
copy .env.example .env
```

Los valores incluidos son placeholders de desarrollo local. No son secretos
reales y no deben copiarse a produccion.

## Validar configuracion

```bash
npm run env:check
```

Si falta una variable requerida, el backend falla con un mensaje que lista las
variables faltantes y pide copiar `.env.example` a `.env`.

## Variables requeridas

| Variable | Uso |
| --- | --- |
| `APP_ENV` | Entorno de ejecucion: `development`, `test` o `production`. |
| `BACKEND_PORT` | Puerto HTTP del backend. |
| `PUBLIC_APP_URL` | URL publica del frontend. |
| `INTERNAL_API_URL` | URL interna usada para comunicacion entre servicios. |
| `DATABASE_URL` | Conexion de base de datos. |
| `AUTH_SECRET` | Secreto de firma para auth; usar solo placeholders en desarrollo. |
| `AUTH_TOKEN_TTL_MINUTES` | Duracion de tokens de autenticacion en minutos. |
| `FILE_STORAGE_DRIVER` | Driver de archivos; por ahora `local`. |
| `FILE_STORAGE_PATH` | Ruta local para archivos cargados. |
| `EVIDENCE_MAX_FILE_MB` | Limite local de tamano para evidencias. |
| `CORS_ORIGIN` | Origen permitido para llamadas desde frontend. |
| `VITE_API_URL` | URL publica del backend para el frontend. |

## Manejo de secretos y evidencias

- `.env` y `.env.*` estan ignorados por Git, excepto `.env.example`.
- `uploads/`, `evidence/`, `source-materials/`, `private/` y formatos de
  evidencia/documentos fuente estan ignorados por Git.
- No se deben versionar credenciales, archivos fuente confidenciales,
  evidencias reales ni datos personales.
- En produccion, `AUTH_SECRET` no puede usar valores de ejemplo como
  `local`, `example`, `placeholder` o `change-me`.
