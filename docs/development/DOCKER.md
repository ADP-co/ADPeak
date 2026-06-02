# Docker local

`SCRUM-58` agrega un entorno local con Docker Compose para frontend, backend y
base de datos PostgreSQL.

## Requisitos

- Docker Desktop o Docker Engine con Compose v2.
- No se requieren secretos reales. Los valores de `.env.example` son solo para
  desarrollo local.

## Levantar el entorno

```bash
npm run docker:up
```

Servicios publicados:

| Servicio | URL local | Descripcion |
| --- | --- | --- |
| Frontend | `http://127.0.0.1:5173` | Vite/React en modo desarrollo. |
| Backend | `http://127.0.0.1:8000/health` | API local con healthcheck. |
| PostgreSQL | `127.0.0.1:5432` | Base de datos local persistida en volumen. |

Para detener el entorno:

```bash
npm run docker:down
```

Para ver logs:

```bash
npm run docker:logs
```

## Variables de entorno

Docker Compose usa los valores por defecto definidos en `compose.yaml`. Si se
necesitan cambios locales, copia `.env.example` a `.env` y ajusta solo valores
de desarrollo.

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `FRONTEND_PORT` | `5173` | Puerto publicado para el frontend. |
| `BACKEND_PORT` | `8000` | Puerto publicado para el backend. |
| `POSTGRES_PORT` | `5432` | Puerto publicado para PostgreSQL. |
| `POSTGRES_DB` | `sigi_poa_dev` | Base de datos local. |
| `POSTGRES_USER` | `sigi_poa` | Usuario local de PostgreSQL. |
| `APP_ENV` | `development` | Entorno de ejecucion del backend. |
| `PUBLIC_APP_URL` | `http://127.0.0.1:5173` | URL publica del frontend. |
| `INTERNAL_API_URL` | `http://backend:8000` | URL interna del backend dentro de Docker. |
| `POSTGRES_PASSWORD` | `local_dev_password_not_secret` | Contrasena local no secreta. |
| `VITE_API_URL` | `http://127.0.0.1:8000` | URL publica de backend usada por el frontend. |
| `DATABASE_URL` | `postgresql://sigi_poa:local_dev_password_not_secret@127.0.0.1:5432/sigi_poa_dev` | URL para herramientas ejecutadas fuera de Docker. |
| `AUTH_SECRET` | `local-dev-auth-secret-change-me` | Placeholder local para auth. |
| `AUTH_TOKEN_TTL_MINUTES` | `60` | Duracion local de tokens. |
| `FILE_STORAGE_DRIVER` | `local` | Driver de archivos. |
| `FILE_STORAGE_PATH` | `uploads` | Ruta local ignorada por Git. |
| `EVIDENCE_MAX_FILE_MB` | `25` | Limite local de carga de evidencias. |
| `CORS_ORIGIN` | `http://127.0.0.1:5173` | Origen permitido para frontend. |

Dentro de Docker, el backend se conecta a PostgreSQL por el host interno `db`.

## Migraciones

Para ejecutar el punto unico de migraciones dentro del entorno Docker:

```bash
npm run docker:migrate
```

El comando actual valida y lista archivos SQL versionados en
`apps/backend/migrations`, incluyendo checksum. La migracion inicial esta
preparada para PostgreSQL; cuando se conecte el motor definitivo, este comando
debe seguir siendo el punto unico de ejecucion dentro de Docker.

## Volumenes

| Volumen | Uso |
| --- | --- |
| `postgres_data` | Persistencia de datos locales de PostgreSQL. |
| `node_modules` | Dependencias instaladas dentro de la imagen para no depender del host. |

Para reiniciar la base local desde cero:

```bash
docker compose down -v
```
