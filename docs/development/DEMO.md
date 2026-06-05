# Ambiente demo

Este documento cierra `SCRUM-62`, `SCRUM-63`, `SCRUM-64` y `SCRUM-65`.
La demo usa datos ficticios y controlados para mostrar el MVP sin exponer
informacion confidencial.

## Alcance

- Frontend local compartible: `http://127.0.0.1:5173`.
- API local: `http://127.0.0.1:8000`.
- Healthcheck: `GET /health`.
- Estado demo: `GET /demo/status`.
- Usuarios demo: `GET /demo/users`.
- Dataset demo: `GET /demo/data`.
- Login demo: `POST /demo/login`.

## Usuarios de prueba

| Rol | Correo | Codigo |
| --- | --- | --- |
| Administrador DGEMS | `admin.demo@adpeak.local` | `demo-admin` |
| Plantel | `plantel.demo@adpeak.local` | `demo-plantel` |
| Responsable de indicador | `responsable.demo@adpeak.local` | `demo-responsable` |

Estos codigos son valores publicos de demo. No son credenciales reales y no se
deben reutilizar en produccion.

## Preparacion local

```bash
npm ci
npm run demo:seed
npm run demo:check
```

`npm run demo:check` ejecuta seed, tipado, pruebas, build y validacion estatica
del ambiente demo. Si no existe `.env`, lo crea desde `.env.demo.example`.

## Levantar con Docker

```bash
npm run demo:up
```

El comando usa `.env.demo.example`, `compose.yaml` y `compose.demo.yaml`.
Publica frontend, backend y PostgreSQL con una base `sigi_poa_demo`.

Para detener:

```bash
npm run demo:down
```

Para logs:

```bash
npm run demo:logs
```

## Migraciones y seed

Los archivos versionados de demo son:

- `apps/backend/migrations/20260605_001_demo_schema.sql`
- `apps/backend/migrations/20260605_002_demo_seed.sql`

Validar que existan y que cubran los datos ficticios:

```bash
npm run demo:seed
```

Cuando el motor de migraciones definitivo quede integrado, estos archivos deben
ejecutarse como parte del flujo normal de migracion de demo.

## Validacion de acceso

Con el ambiente levantado, ejecutar:

```bash
npm run demo:validate-access
```

Para validar sin Docker despues de `npm run demo:build`, levantar en dos
terminales:

```bash
npm --workspace @adpeak/backend run start
npm run demo:preview
```

La validacion comprueba:

- Frontend responde.
- API responde en `/health`.
- Dataset demo responde.
- Login demo funciona para los tres roles.
- Cada rol recibe su flujo principal.

## Checklist previo a presentacion

1. `git status` limpio en la rama de demo.
2. `.env` creado desde `.env.demo.example`; no usar secretos reales.
3. `npm run demo:check` pasa sin errores.
4. `npm run demo:up` levanta frontend, backend y base local.
5. `npm run demo:validate-access` pasa con los tres roles.
6. Abrir `http://127.0.0.1:5173` y seleccionar cada rol.
7. Confirmar que `GET /demo/data` muestra solo informacion ficticia.
8. Confirmar que no hay archivos reales en `uploads-demo/`.
9. Tomar evidencia visual de frontend, healthcheck y dataset demo.
10. Detener el entorno con `npm run demo:down`.

## Rollback manual

Si la demo falla:

```bash
npm run demo:down
docker compose --env-file .env.demo.example -f compose.yaml -f compose.demo.yaml down -v
npm run demo:up
```

El comando con `-v` borra volumenes locales de la demo. No debe ejecutarse
contra ambientes que contengan informacion real.

## Seguridad

- No copiar PDFs, Excel, evidencias reales ni datos personales al repo.
- No subir `.env`; solo se versionan `.env.example` y `.env.demo.example`.
- Los usuarios demo son ficticios y usan el dominio reservado
  `adpeak.local`.
- El build demo se valida con `npm run demo:build` y no requiere rutas locales
  absolutas ni secretos reales.
