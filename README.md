# SIGI-POA DGEMS

Sistema Integral de Gestion de Indicadores del Programa Operativo Anual para la Direccion General de Educacion Media Superior.

Este repositorio contiene el codigo y la documentacion tecnica no confidencial del proyecto ADPeak/SIGI-POA DGEMS. No se deben versionar evidencias reales, archivos Excel institucionales, PDFs de soporte, ZIPs de fuentes, documentos con datos personales ni secretos de entorno.

## Objetivo del sistema

Centralizar la captura, seguimiento, validacion y reporte de indicadores del POA por plantel, actividad, periodo y ciclo anual, sustituyendo el manejo disperso de Excel y carpetas en la nube por una aplicacion web con control de acceso, trazabilidad y reportes oportunos.

## Roles funcionales

- **Plantel**: captura avances, carga evidencias y consulta el estado de sus actividades.
- **Responsable de indicador**: revisa informacion de planteles asignados, valida avances y solicita correcciones.
- **Administrador DGEMS**: administra usuarios, planteles, indicadores, periodos, permisos y reportes globales.

## Stack tecnico actual

- **Monorepo**: npm workspaces.
- **Frontend**: React, TypeScript y Vite.
- **Backend**: Node.js, TypeScript y servidor HTTP ligero.
- **Configuracion**: variables de entorno cargadas con `dotenv` y validadas en `apps/backend/src/config.ts`.
- **Base de datos local**: PostgreSQL 16 via Docker Compose.
- **Pruebas**: Vitest en frontend y backend.
- **Contenedores**: Dockerfile multi-stage y `compose.yaml` para frontend, backend y base de datos.

## Requisitos locales

- Node.js `20.19.0` o superior, o Node.js `22.12.0` o superior.
- npm `10` o superior.
- Docker Desktop o Docker Engine con Compose para levantar el entorno completo.
- Git.

Verifica versiones:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Instalacion local

1. Instala dependencias reproducibles:

```bash
npm ci
```

2. Crea tu archivo local de entorno desde la plantilla:

```bash
copy .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

3. Valida la configuracion:

```bash
npm run env:check
```

4. Ejecuta validaciones completas:

```bash
npm run check
```

5. Levanta frontend y backend en terminales separadas:

```bash
npm run dev:frontend
npm run dev:backend
```

URLs locales por defecto:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Healthcheck: `http://127.0.0.1:8000/health`

## Docker local

Para levantar frontend, backend y PostgreSQL con un solo comando:

```bash
npm run docker:up
```

Comandos utiles:

```bash
npm run docker:logs
npm run docker:migrate
npm run docker:down
```

El entorno Docker usa valores locales de desarrollo definidos en `.env.example` o en tu `.env`. Esos valores son placeholders y no deben copiarse a produccion.

## Variables de entorno

La plantilla local esta en `.env.example`. Las variables principales son:

| Variable | Uso |
| --- | --- |
| `APP_ENV` | Entorno de ejecucion: `development`, `test` o `production`. |
| `FRONTEND_PORT` | Puerto publicado del frontend en Docker. |
| `BACKEND_PORT` | Puerto HTTP del backend. |
| `PUBLIC_APP_URL` | URL publica del frontend. |
| `INTERNAL_API_URL` | URL interna para comunicacion entre servicios. |
| `VITE_API_URL` | URL publica del backend consumida por el frontend. |
| `DATABASE_URL` | Conexion local a la base de datos. |
| `AUTH_SECRET` | Secreto de firma para autenticacion; usar solo placeholders en desarrollo. |
| `AUTH_TOKEN_TTL_MINUTES` | Duracion de tokens de autenticacion en minutos. |
| `FILE_STORAGE_DRIVER` | Driver de archivos; actualmente `local`. |
| `FILE_STORAGE_PATH` | Ruta local para archivos cargados. |
| `EVIDENCE_MAX_FILE_MB` | Tamano maximo local para evidencias. |
| `CORS_ORIGIN` | Origen permitido para llamadas desde frontend. |

Reglas:

- `.env` y `.env.*` no se suben a Git.
- `.env.example` solo puede contener valores ficticios o placeholders.
- En produccion, `AUTH_SECRET` no puede usar valores como `local`, `example`, `placeholder` o `change-me`.

Mas detalle: [docs/development/CONFIGURATION.md](docs/development/CONFIGURATION.md).

## Comandos disponibles

| Comando | Proposito |
| --- | --- |
| `npm run setup` | Alias para instalar dependencias con `npm install`. |
| `npm run dev:frontend` | Levanta Vite en `127.0.0.1:5173`. |
| `npm run dev:backend` | Levanta el backend en `127.0.0.1:8000`. |
| `npm run env:check` | Valida variables requeridas del backend. |
| `npm run migrate` | Prepara/lista migraciones SQL del backend. |
| `npm test` | Ejecuta pruebas de todos los workspaces. |
| `npm run test:frontend` | Ejecuta pruebas del frontend. |
| `npm run test:backend` | Ejecuta pruebas del backend. |
| `npm run typecheck` | Valida TypeScript en todos los workspaces. |
| `npm run build` | Compila frontend y backend. |
| `npm run check` | Ejecuta typecheck, pruebas y build. |
| `npm run docker:up` | Levanta frontend, backend y PostgreSQL. |
| `npm run docker:down` | Detiene el entorno Docker local. |
| `npm run docker:logs` | Sigue logs del entorno Docker local. |
| `npm run docker:migrate` | Ejecuta `npm run migrate` dentro del servicio backend. |

Mas detalle: [docs/development/SCRIPTS.md](docs/development/SCRIPTS.md).

## Estructura del repositorio

```text
.
├── apps/
│   ├── backend/
│   │   ├── migrations/          # SQL versionado para base de datos
│   │   ├── scripts/             # utilidades de config y migracion
│   │   └── src/                 # servidor, config y healthcheck
│   └── frontend/
│       └── src/                 # app React, config cliente y estilos
├── docs/
│   ├── development/             # scripts, Docker y configuracion
│   ├── project/                 # brief, requisitos, plan y matriz
│   └── security/                # manejo de datos confidenciales
├── compose.yaml                 # entorno local con PostgreSQL
├── Dockerfile                   # imagen de desarrollo
├── package.json                 # scripts del monorepo
└── README.md
```

## Migraciones

El punto unico de entrada es:

```bash
npm run migrate
```

El script del backend trabaja sobre `apps/backend/migrations` y lista archivos `.sql` versionados en orden alfabetico. Para agregar una migracion:

1. Crea un archivo SQL con prefijo ordenable, por ejemplo `001_create_base_tables.sql`.
2. Incluye operaciones idempotentes cuando sea posible.
3. Documenta tablas, llaves, indices y restricciones en el mismo cambio.
4. Ejecuta:

```bash
npm run migrate
npm run check
```

Dentro de Docker:

```bash
npm run docker:migrate
```

## Pruebas

Ejecuta todo:

```bash
npm test
```

Por workspace:

```bash
npm run test:frontend
npm run test:backend
```

Validacion completa antes de abrir PR:

```bash
npm run check
```

Los casos actuales cubren configuracion de cliente, configuracion de backend y healthcheck. Los planes funcionales por rol deben mantenerse en documentacion de QA cuando se agreguen flujos de plantel, responsable y administrador.

## Flujo de ramas

- `main`: rama estable/publicable.
- `develop`: integracion de trabajo validado.
- `feature/<nombre>` o `feature/SCRUM-<id>-<descripcion>`: trabajo por historia o modulo.
- `codex/<descripcion>`: ramas generadas por automatizacion o asistencia.

Flujo recomendado:

```bash
git fetch origin
git checkout develop
git pull --ff-only
git checkout -b feature/SCRUM-XX-descripcion
```

Antes de integrar:

```bash
git status
npm run check
git diff --name-only
```

Usa Pull Request hacia `develop` y describe el SCRUM, pruebas ejecutadas, riesgos y cambios de configuracion.

Mas detalle: [BRANCH_GUIDE.md](BRANCH_GUIDE.md).

## Seguridad y datos reales

Este repositorio no debe contener:

- Evidencias reales de planteles.
- Excel institucionales o libros maestros con datos reales.
- PDFs, ZIPs, imagenes o documentos fuente del proceso operativo.
- Datos personales de estudiantes, docentes o personal administrativo.
- Credenciales, tokens, URLs privadas o dumps de base de datos.

Para desarrollo:

- Usa datos ficticios y archivos de prueba minimos.
- Guarda evidencias locales en rutas ignoradas por Git, como `uploads/`.
- Revisa `git diff --name-only` antes de cada commit.
- Si aparece un archivo sensible, deten el PR y muevelo al repositorio privado o almacenamiento autorizado.

Politica completa: [docs/security/DATA_HANDLING.md](docs/security/DATA_HANDLING.md).

## Documentacion relacionada

- [Resumen del proyecto](docs/project/PROJECT_BRIEF.md)
- [Requerimientos](docs/project/REQUIREMENTS.md)
- [Plan de accion](docs/project/ACTION_PLAN.md)
- [Preguntas para reunion con DGEMS](docs/project/MEETING_QUESTIONS.md)
- [Matriz de preguntas y respuestas](docs/project/QUESTION_MATRIX.md)
- [Plan de pruebas por rol](docs/qa/TEST_PLAN_BY_ROLE.md)
- [Configuracion de entorno](docs/development/CONFIGURATION.md)
- [Scripts de desarrollo](docs/development/SCRIPTS.md)
- [Docker local](docs/development/DOCKER.md)
- [Manejo de datos confidenciales](docs/security/DATA_HANDLING.md)
