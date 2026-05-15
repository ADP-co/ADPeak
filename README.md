# SIGI-POA DGEMS

Sistema Integral de Gestión de Indicadores del Programa Operativo Anual para la Dirección General de Educación Media Superior.

Este repositorio contiene el código y la documentación no confidencial del proyecto. El ciclo inicial de operación será el POA 2026, pero el sistema debe quedar preparado para administrar futuros años. Los documentos fuente, evidencias, hojas de cálculo y archivos con datos personales se administran en el repositorio privado de materiales confidenciales y no deben copiarse aquí.

## Objetivo

Centralizar la captura, seguimiento, validación y reporte de indicadores del POA por plantel, actividad y año operativo, sustituyendo el manejo disperso de archivos Excel y carpetas en la nube por un sistema web con control de acceso, trazabilidad y reportes oportunos.

## Usuarios

- **Plantel**: captura avances, carga evidencias y consulta el estado de sus actividades.
- **Responsable de indicador**: revisa información de los planteles asignados, valida avances y solicita correcciones.
- **Administrador DGEMS**: administra usuarios, planteles, indicadores, periodos, permisos y reportes globales.

## Decisiones confirmadas

- Nombre oficial para documentación institucional: **SIGI-POA DGEMS**.
- Nombre interno del equipo: **ADPeak**.
- Primer ciclo a cubrir: **POA 2026**.
- El sistema debe soportar futuros ciclos anuales.
- Primera demo funcional objetivo: **31 de mayo de 2026**.
- Autoridad funcional para aprobación de requisitos y cambios: **Administrador DGEMS**.

## Alcance inicial

El análisis de los documentos fuente confirmó estos bloques de trabajo:

- Catálogo de indicadores, actividades, responsables, contribuyentes y planteles.
- Formularios de captura configurables por indicador.
- Carga controlada de evidencias documentales.
- Flujo de revisión, observaciones, correcciones y aprobación.
- Dashboard de avance por periodo, plantel, actividad e indicador.
- Reportes exportables para seguimiento institucional.
- Auditoría de cambios y segregación de información por rol.

## Documentación

- [Resumen del proyecto](docs/project/PROJECT_BRIEF.md)
- [Requerimientos](docs/project/REQUIREMENTS.md)
- [Plan de acción](docs/project/ACTION_PLAN.md)
- [Preguntas para reunión con DGEMS](docs/project/MEETING_QUESTIONS.md)
- [Matriz de preguntas y respuestas](docs/project/QUESTION_MATRIX.md)
- [Manejo de datos confidenciales](docs/security/DATA_HANDLING.md)
- [Configuracion de entorno](docs/development/CONFIGURATION.md)
- [Scripts de desarrollo](docs/development/SCRIPTS.md)
- [Guía de ramas](BRANCH_GUIDE.md)

El archivo original de planeación visual quedó archivado en [docs/project/action-plan-original.pdf](docs/project/action-plan-original.pdf). La versión editable y vigente del plan es [docs/project/ACTION_PLAN.md](docs/project/ACTION_PLAN.md).

## Desarrollo local

Requisitos:

- Node.js 20.19 o superior, o Node.js 22.12 o superior.
- npm 10 o superior.

Instalacion y validacion inicial:

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
npm run migrate
npm test
```

La documentacion completa de scripts esta en [docs/development/SCRIPTS.md](docs/development/SCRIPTS.md).

## Docker local

El entorno local completo se levanta con:

```bash
npm run docker:up
```

Este comando inicia frontend, backend y PostgreSQL con variables de desarrollo
definidas en `.env.example`; no requiere secretos reales. La guia completa esta
en [docs/development/DOCKER.md](docs/development/DOCKER.md).

## Stack propuesto

- **Frontend**: React, TypeScript, React Hook Form, Zod y TanStack Query.
- **Backend**: API web con Python/FastAPI o stack equivalente definido por el equipo.
- **Base de datos**: PostgreSQL o MySQL, con migraciones versionadas.
- **Archivos**: almacenamiento privado para evidencias, con referencias en base de datos.
- **Reportes**: exportación PDF/Excel y gráficos para tableros.
- **Operación**: Docker para ambientes reproducibles.

La decisión final del stack debe quedar registrada antes de iniciar implementación.

## Reglas de seguridad

- No subir ZIP, Excel, PDFs de evidencia, documentos fuente ni datos personales a este repositorio público.
- No documentar nombres de estudiantes, números de cuenta, resultados de admisión o constancias individuales.
- Las fuentes confidenciales se consultan únicamente desde el repositorio privado autorizado.
- Cualquier credencial debe vivir en variables de entorno o secretos del proveedor, nunca en Git.
