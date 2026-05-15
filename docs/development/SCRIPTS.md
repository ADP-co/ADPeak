# Scripts de desarrollo

Estos comandos cubren la instalacion local, frontend, backend, migraciones,
Docker local y pruebas para el entorno de desarrollo.

## Requisitos

- Node.js 20.19 o superior, o Node.js 22.12 o superior.
- npm 10 o superior.
- Copiar `.env.example` a `.env` solo cuando se necesiten valores locales
  distintos. El proyecto funciona con los valores por defecto.

## Instalacion limpia

```bash
npm ci
npm run check
```

`npm ci` instala una version reproducible desde `package-lock.json`.
`npm install` queda disponible para desarrollo cuando se agreguen dependencias.
`npm run check` ejecuta tipado, pruebas y build.

## Comandos principales

| Comando | Proposito |
| --- | --- |
| `npm ci` | Instala dependencias exactas desde `package-lock.json`. |
| `npm install` | Instala dependencias desde `package-lock.json`. |
| `npm run setup` | Alias documentado para ejecutar `npm install`. |
| `npm run dev:frontend` | Levanta Vite en `http://127.0.0.1:5173`. |
| `npm run dev:backend` | Levanta la API local en `http://127.0.0.1:8000`. |
| `npm run migrate` | Prepara/lista migraciones SQL en `apps/backend/migrations`. |
| `npm run docker:up` | Levanta frontend, backend y PostgreSQL con Docker Compose. |
| `npm run docker:down` | Detiene el entorno Docker local. |
| `npm run docker:logs` | Muestra logs del entorno Docker local. |
| `npm run docker:migrate` | Ejecuta migraciones desde el servicio backend de Docker. |
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
| `FRONTEND_PORT` | `5173` | Puerto publicado para el frontend en Docker. |
| `BACKEND_PORT` | `8000` | Puerto de la API local. |
| `POSTGRES_PORT` | `5432` | Puerto publicado para PostgreSQL en Docker. |
| `POSTGRES_DB` | `sigi_poa_dev` | Base de datos local de desarrollo. |
| `POSTGRES_USER` | `sigi_poa` | Usuario local de PostgreSQL. |
| `POSTGRES_PASSWORD` | `sigi_poa_dev_password` | Contrasena local no secreta. |
| `VITE_API_URL` | `http://127.0.0.1:8000` | URL de backend usada por el frontend. |
| `DATABASE_URL` | `postgresql://sigi_poa:sigi_poa_dev_password@127.0.0.1:5432/sigi_poa_dev` | URL local para herramientas fuera de Docker. |

El backend expone `GET /health` para verificar que el servicio local responde.

La guia especifica de Docker esta en [DOCKER.md](DOCKER.md).

## Migraciones

Mientras el motor de base de datos final no este cerrado, el script
`npm run migrate` prepara el directorio `apps/backend/migrations` y lista los
archivos `.sql` versionados. Cuando se defina PostgreSQL o MySQL, este comando
debe mantenerse como punto unico para ejecutar migraciones reales.
