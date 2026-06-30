# ADPeak / SIGI-POA DGEMS

Sistema web para la captura, seguimiento, revision y reporte de indicadores del Programa Operativo Anual de la Direccion General de Educacion Media Superior.

Este repositorio contiene el codigo y la documentacion tecnica no confidencial del proyecto. No debe almacenar evidencias reales, hojas de calculo institucionales, documentos fuente con datos personales ni credenciales.

## Estado del proyecto

- Producto: SIGI-POA DGEMS.
- Nombre interno: ADPeak.
- Ciclo inicial: POA 2026.
- Rama de integracion: `develop`.
- Stack actual: monorepo npm con frontend React/TypeScript y backend TypeScript/Node.
- Base local: PostgreSQL por Docker Compose.
- Demo local: datos ficticios bajo scripts `demo:*`.

## Arquitectura

```txt
apps/
  frontend/        React, Vite, TypeScript, Tailwind, React Hook Form, Zod
  backend/         TypeScript, API HTTP nativa, validaciones y endpoints demo
docs/
  architecture/    Vision tecnica y limites del sistema
  development/     Configuracion, scripts, Docker, demo y mantenimiento
  project/         Alcance funcional, requisitos y planeacion
  security/        Manejo de informacion sensible
```

El detalle tecnico esta en [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md).

## Requisitos

- Node.js `20.19+` o `22.12+`.
- npm `10+`.
- Docker Desktop para levantar frontend, backend y PostgreSQL juntos.

## Inicio rapido

```bash
npm ci
copy .env.example .env
npm run env:check
npm run check
```

Comandos principales:

```bash
npm run dev:frontend
npm run dev:backend
npm run docker:up
npm run demo:up
```

URLs locales:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Healthcheck: `http://127.0.0.1:8000/health`
- Dataset demo: `http://127.0.0.1:8000/demo/data`

## Verificacion antes de entregar

Ejecutar siempre:

```bash
npm run repo:verify
```

Ese comando corre tipado, pruebas, build y revision de whitespace con Git. Para validar Docker:

```bash
npm run docker:config
npm run demo:config
```

## Despliegue publico

El repositorio incluye `vercel.json` y funciones serverless en `api/` para
desplegar frontend y API en un mismo dominio de Vercel. En hosting, el
frontend usa `/api/v1` por defecto, por lo que no depende de `127.0.0.1`,
Docker local ni tuneles temporales.

## Documentacion clave

- [Arquitectura](docs/architecture/OVERVIEW.md)
- [Guia de mantenimiento](docs/development/MAINTENANCE.md)
- [Configuracion](docs/development/CONFIGURATION.md)
- [Scripts](docs/development/SCRIPTS.md)
- [Docker](docs/development/DOCKER.md)
- [Demo](docs/development/DEMO.md)
- [Checklist QA demo](docs/development/DEMO_QA_CHECKLIST.md)
- [Cierre QA empresarial](docs/project/ENTERPRISE_QA_CLOSURE.md)
- [Matriz de indicadores oficiales](docs/project/INDICATOR_IMPORT_VALIDATION_MATRIX.md)
- [Requerimientos](docs/project/REQUIREMENTS.md)
- [Resumen funcional](docs/project/PROJECT_BRIEF.md)
- [Manejo de datos confidenciales](docs/security/DATA_HANDLING.md)
- [Guia de ramas](BRANCH_GUIDE.md)

## Convenciones de codigo

- Frontend canonical: `apps/frontend/src/components`.
- API frontend: `apps/frontend/src/api`.
- Estado transversal frontend: `apps/frontend/src/context` y `apps/frontend/src/hooks`.
- Backend: `apps/backend/src`.
- Scripts backend: `apps/backend/scripts`.
- Migraciones SQL: `apps/backend/migrations`.
- Documentacion tecnica: `docs/development` y `docs/architecture`.

No crear carpetas duplicadas para el mismo concepto. Si se cambia un flujo, actualizar su documentacion en el mismo Pull Request.

## Seguridad

- `.env` esta ignorado por Git.
- Solo se versionan `.env.example` y `.env.demo.example`.
- No subir ZIP, Excel, PDFs de evidencia, documentos fuente ni datos personales.
- No usar secretos reales en desarrollo, demo, documentacion o capturas.
- Los valores `*_not_secret`, `placeholder` y `change-me` son solo placeholders locales.

## Flujo de trabajo

1. Crear rama desde `develop`.
2. Mantener cambios acotados por modulo.
3. Ejecutar `npm run repo:verify`.
4. Abrir Pull Request hacia `develop` con alcance, pruebas y riesgos.
5. Fusionar a `main` solo desde una rama de release aprobada.

La politica completa esta en [BRANCH_GUIDE.md](BRANCH_GUIDE.md).
