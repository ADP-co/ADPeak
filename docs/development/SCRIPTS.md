# Scripts de desarrollo

Estos comandos cubren la instalacion local, frontend, backend, migraciones y
pruebas para `SCRUM-57`.

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
| `BACKEND_PORT` | `8000` | Puerto de la API local. |
| `VITE_API_URL` | `http://127.0.0.1:8000` | URL de backend usada por el frontend. |

El backend expone `GET /health` para verificar que el servicio local responde.

## Migraciones

Mientras el motor de base de datos final no este cerrado, el script
`npm run migrate` prepara el directorio `apps/backend/migrations` y lista los
archivos `.sql` versionados. Cuando se defina PostgreSQL o MySQL, este comando
debe mantenerse como punto unico para ejecutar migraciones reales.
