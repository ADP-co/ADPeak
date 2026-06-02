# ADPeak API

API NestJS para el MVP SIGI/POA de ADPeak.

## Stack

- NestJS + TypeScript.
- Validacion global con `ValidationPipe`, `whitelist`, `forbidNonWhitelisted` y `transform`.
- SQLite local mediante `node:sqlite` para persistencia demo y pruebas de integracion.

## Comandos

```bash
npm install
npm run migrate
npm run start:dev
npm run build
npm test
npm run test:e2e
```

La API escucha en `http://localhost:3000/api/v1`.

## Migraciones y datos demo

Por defecto se crea `data/adpeak.sqlite`. Para pruebas aisladas se puede usar:

```bash
ADPEAK_DB_PATH=:memory: npm run test:e2e
```

El esquema versionado se define en `src/database/schema.ts` y crea tablas base de roles, usuarios, planteles, ciclos POA, periodos, indicadores, actividades, asignaciones, capturas, versiones, evidencias, revisiones y auditoria.

## Contratos

Los contratos de captura, revision, dashboard y reportes estan documentados en `docs/API_CONTRACTS.md`.

## Seguridad de datos

No versionar bases SQLite generadas, archivos de evidencia, excels institucionales, PDFs privados ni secretos reales. La rama usa datos demo controlados para pruebas.
