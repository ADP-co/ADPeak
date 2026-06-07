# Scripts de desarrollo

Estos comandos cubren la instalacion local, frontend, backend, migraciones,
Docker local y pruebas para el entorno de desarrollo.

## Requisitos

- Node.js 20.19 o superior, o Node.js 22.12 o superior.
- npm 10 o superior.
- Copiar `.env.example` a `.env` antes de levantar la app local fuera de Docker.

## Instalacion limpia

```bash
npm ci
copy .env.example .env
npm run env:check
npm run check
```

`npm ci` instala una version reproducible desde `package-lock.json`.
`npm install` queda disponible para desarrollo cuando se agreguen dependencias.
`npm run env:check` valida que la configuracion requerida este completa.
`npm run check` ejecuta tipado, pruebas y build.

## Comandos principales

| Comando | Proposito |
| --- | --- |
| `npm ci` | Instala dependencias exactas desde `package-lock.json`. |
| `npm install` | Instala dependencias desde `package-lock.json`. |
| `npm run setup` | Alias documentado para ejecutar `npm install`. |
| `npm run env:check` | Valida variables requeridas desde `.env`. |
| `npm run dev:frontend` | Levanta Vite en `http://127.0.0.1:5173`. |
| `npm run dev:backend` | Levanta la API local en `http://127.0.0.1:8000`. |
| `npm run migrate` | Prepara/lista migraciones SQL en `apps/backend/migrations`. |
| `npm run docker:up` | Levanta frontend, backend y PostgreSQL con Docker Compose. |
| `npm run docker:down` | Detiene el entorno Docker local. |
| `npm run docker:logs` | Muestra logs del entorno Docker local. |
| `npm run docker:migrate` | Ejecuta migraciones desde el servicio backend de Docker. |
| `npm run demo:prepare-env` | Crea o valida `.env` desde `.env.demo.example`. |
| `npm run demo:seed` | Valida seed SQL y datos ficticios de demo. |
| `npm run demo:validate` | Valida configuracion, usuarios, dataset y archivos requeridos de demo. |
| `npm run demo:build` | Valida demo y ejecuta build de frontend/backend. |
| `npm run demo:check` | Ejecuta seed, check completo y validacion demo. |
| `npm run demo:up` | Levanta frontend, backend y PostgreSQL en modo demo. |
| `npm run demo:down` | Detiene el entorno demo. |
| `npm run demo:logs` | Muestra logs del entorno demo. |
| `npm run demo:validate-access` | Valida frontend, API, dataset y login demo por rol. |
| `npm run demo:preview` | Prepara env, construye `apps/frontend/dist` y sirve la demo en `http://127.0.0.1:5173`. |
| `npm test` | Ejecuta pruebas de frontend y backend. |
| `npm run build` | Compila frontend y backend. |
| `npm run typecheck` | Valida TypeScript en todos los workspaces. |
| `npm run check` | Corre `typecheck`, `test` y `build`. |

## Comandos por workspace

```bash
npm run test:frontend
npm run test:backend
npm --workspace @adpeak/frontend run preview
npm --workspace @adpeak/backend run start
```

## Puertos y variables

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `APP_ENV` | `development` | Entorno de ejecucion. |
| `FRONTEND_PORT` | `5173` | Puerto publicado para el frontend en Docker. |
| `BACKEND_PORT` | `8000` | Puerto de la API local. |
| `PUBLIC_APP_URL` | `http://127.0.0.1:5173` | URL publica del frontend. |
| `INTERNAL_API_URL` | `http://127.0.0.1:8000` | URL interna para comunicacion entre servicios. |
| `POSTGRES_PORT` | `5432` | Puerto publicado para PostgreSQL en Docker. |
| `POSTGRES_DB` | `sigi_poa_dev` | Base de datos local de desarrollo. |
| `POSTGRES_USER` | `sigi_poa` | Usuario local de PostgreSQL. |
| `POSTGRES_PASSWORD` | `local_dev_password_not_secret` | Contrasena local no secreta. |
| `VITE_API_URL` | `http://127.0.0.1:8000` | URL de backend usada por el frontend. |
| `DATABASE_URL` | `postgresql://sigi_poa:local_dev_password_not_secret@127.0.0.1:5432/sigi_poa_dev` | URL local para herramientas fuera de Docker. |
| `AUTH_SECRET` | `local-dev-auth-secret-change-me` | Placeholder local para auth; no usar en produccion. |
| `AUTH_TOKEN_TTL_MINUTES` | `60` | Duracion local de tokens. |
| `FILE_STORAGE_DRIVER` | `local` | Driver de archivos. |
| `FILE_STORAGE_PATH` | `uploads` | Ruta local ignorada por Git. |
| `EVIDENCE_MAX_FILE_MB` | `25` | Limite local de carga de evidencias. |
| `CORS_ORIGIN` | `http://127.0.0.1:5173` | Origen permitido para frontend. |

El backend expone `GET /health` para verificar que el servicio local responde.
El modo demo agrega `GET /demo/status`, `GET /demo/users`, `GET /demo/data`,
`GET /demo/roles` y `POST /demo/login`.

La guia especifica de configuracion esta en [CONFIGURATION.md](CONFIGURATION.md).
La guia especifica de Docker esta en [DOCKER.md](DOCKER.md).
La guia especifica de demo esta en [DEMO.md](DEMO.md).

## Migraciones

Mientras el motor de base de datos final no este cerrado, el script
`npm run migrate` prepara el directorio `apps/backend/migrations` y lista los
archivos `.sql` versionados. Cuando se defina PostgreSQL o MySQL, este comando
debe mantenerse como punto unico para ejecutar migraciones reales.
