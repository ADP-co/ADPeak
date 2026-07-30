# ADPeak / SIGI-POA DGEMS

Sistema web institucional para captura, revisión, aprobación y reporte de los
indicadores del Programa Operativo Anual de la Dirección General de Educación
Media Superior.

## Estado

- Versión: `1.0.2`.
- Integración: rama `develop`.
- Frontend: React, Vite y TypeScript.
- Backend: Node.js, TypeScript y PostgreSQL.
- Despliegue integrado: Vercel, con frontend y `/api/v1` en el mismo dominio.
- Catálogo: 16 indicadores operativos trazables a la fuente oficial.
- Baseline: 1 Director, 18 Responsables y 37 Planteles.

El repositorio no contiene contraseñas, evidencias, hojas de cálculo fuente ni
datos personales de estudiantes o beneficiarios. El catálogo backend conserva
únicamente los nombres laborales de responsables institucionales autorizados y
la trazabilidad nominal de sus archivos fuente. Las credenciales iniciales se
entregan por un canal privado y obligan a cambio de contraseña.

## Estructura

```text
api/                    Adaptadores serverless para Vercel
apps/frontend/          Interfaz React
apps/backend/           Dominio, API local, persistencia y migraciones
docs/                   Arquitectura, operación, seguridad y matrices oficiales
tools/import-*.py       Importador reproducible de fuentes oficiales
tools/qa/               Certificación sobre una base clonada
tools/quality/          Escaneos de seguridad e higiene
tools/release/          Empaquetado reproducible y portable
```

## Requisitos

- Node.js 22 LTS.
- npm 10 o superior.
- Python 3.12 con `openpyxl` para verificar el importador.
- PostgreSQL 15 o superior para ejecución local persistente.
- Docker Desktop es opcional.

## Instalación

```bash
npm ci
copy .env.example .env
npm run env:check
npm run repo:verify
```

Desarrollo local:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Salud: `http://127.0.0.1:8000/health`

## Calidad

El comando obligatorio antes de integrar o entregar es:

```bash
npm run repo:verify
```

Incluye:

- TypeScript estricto y detección de código sin uso.
- Pruebas frontend y backend.
- Build de ambos workspaces.
- Escaneo de secretos y archivos no permitidos.
- Auditoría de dependencias con excepciones acotadas y vencimiento.
- Verificación del importador oficial.
- Aplicación aislada de migraciones productivas sobre PostgreSQL en CI.
- Dry-run de clonación, seed, certificación y limpieza QA.
- Validación de whitespace de Git.

Las verificaciones de Docker se ejecutan con:

```bash
npm run docker:config
npm run demo:config
```

## Certificación aislada

Los comandos `qa:clone`, `qa:seed`, `qa:run`, `qa:serve` y `qa:cleanup`
trabajan únicamente con una base `adpeak_qa_cert_*`. Sus guardas impiden usar
producción. Consulte [docs/development/QA_HARNESS.md](docs/development/QA_HARNESS.md).

## Entrega reproducible

Con un árbol versionado limpio:

```bash
npm run release:build
```

El paquete se escribe fuera del repositorio en `../release`, usa rutas POSIX,
incluye manifiesto SHA-256 por archivo y excluye entornos, evidencias, reportes,
fuentes privadas, dependencias y artefactos QA. Para extraerlo en un directorio
temporal, instalar dependencias y repetir todas las pruebas:

```bash
npm run release:verify
```

## Documentación

- [Arquitectura](docs/architecture/OVERVIEW.md)
- [Acceso y cuentas](docs/development/ACCESS.md)
- [Configuración](docs/development/CONFIGURATION.md)
- [QA aislado](docs/development/QA_HARNESS.md)
- [Manejo de datos](docs/security/DATA_HANDLING.md)
- [Auditoría de dependencias](docs/security/DEPENDENCY_AUDIT.md)
- [Matriz oficial](docs/project/INDICATOR_IMPORT_VALIDATION_MATRIX.md)

## Seguridad de datos

No se deben versionar ZIP, Excel, PDF, CSV, documentos institucionales,
credenciales ni evidencias. `.env`, `output/`, `.vercel/`, resultados de
navegador y corridas QA están excluidos. Los valores de los archivos
`.env*.example` son únicamente placeholders locales.
