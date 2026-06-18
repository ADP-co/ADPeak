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
| `AUTH_SECRET` | Secreto de firma para auth; usar solo placeholders en desarrollo. |
| `AUTH_TOKEN_TTL_MINUTES` | Duración de tokens de autenticación en minutos. |
| `FILE_STORAGE_DRIVER` | Driver de archivos; por ahora `local`. |
| `FILE_STORAGE_PATH` | Ruta local para archivos cargados. |
| `EVIDENCE_MAX_FILE_MB` | Límite local de tamaño para evidencias. |
| `SIGI_DATA_FILE` | Archivo JSON persistente del backend para usuarios, indicadores y capturas. |
| `CORS_ORIGIN` | Origen permitido para llamadas desde frontend. |
| `VITE_API_URL` | URL pública del backend para el frontend. |
| `VITE_API_BASE_URL` | URL base de API versionada para clientes frontend. |

El frontend también acepta `?api=https://host-del-backend` en la URL. Ese
valor se guarda en `localStorage` y permite apuntar GitHub Pages a un backend
público sin recompilar la aplicación.

En despliegues Vercel con Neon, el backend usa `DATABASE_URL` cuando existe y,
si no existe, toma `POSTGRES_URL`, `POSTGRES_PRISMA_URL` o
`POSTGRES_URL_NON_POOLING`. `GET /health` muestra el tipo de persistencia sin
exponer credenciales.

## Manejo de secretos y evidencias

- `.env` y `.env.*` están ignorados por Git, excepto `.env.example`.
- `.env.demo.example` también está permitido porque no contiene secretos reales.
- `uploads/`, `evidence/`, `source-materials/`, `private/` y formatos de
  evidencia/documentos fuente están ignorados por Git.
- No se deben versionar credenciales, archivos fuente confidenciales,
  evidencias reales ni datos personales.
- En producción, `AUTH_SECRET` no puede usar valores de ejemplo como
  `local`, `example`, `placeholder` o `change-me`.
- `SIGI_DATA_FILE` debe apuntar a una ruta escribible del servidor. La carpeta
  `data/` está ignorada por Git para no versionar estado operativo.
