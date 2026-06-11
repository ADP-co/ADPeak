# Guia de Mantenimiento

Esta guia es el punto de entrada para desarrolladores que reciban el proyecto despues del sprint actual.

## Primer dia

```bash
git checkout develop
git pull origin develop
npm ci
copy .env.example .env
npm run repo:verify
```

Si se requiere demo con Docker:

```bash
npm run demo:up
npm run demo:validate-access
```

## Estructura canonica

| Area | Ruta canonica |
| --- | --- |
| Frontend | `apps/frontend` |
| Componentes React | `apps/frontend/src/components` |
| Clientes HTTP frontend | `apps/frontend/src/api` |
| Hooks frontend | `apps/frontend/src/hooks` |
| Backend | `apps/backend` |
| Codigo backend | `apps/backend/src` |
| Scripts backend | `apps/backend/scripts` |
| Migraciones | `apps/backend/migrations` |
| Documentacion tecnica | `docs/development` |
| Arquitectura | `docs/architecture` |
| Seguridad | `docs/security` |

No volver a crear carpetas paralelas como `src/componentes`. Si se requiere compatibilidad temporal, documentarla y retirarla en el mismo sprint.

## Politica de limpieza

Mantener fuera de Git:

- `.env` y cualquier archivo `.env.*` que no sea plantilla.
- Logs locales.
- `node_modules`.
- `dist`, `build`, coverage y artefactos generados.
- PDFs, Excels, ZIPs, evidencias y documentos fuente confidenciales.

Plantillas permitidas:

- `.env.example`
- `.env.demo.example`

## Checklist antes de Pull Request

```bash
npm run repo:verify
npm run docker:config
npm run demo:config
```

Ademas revisar:

- No hay conflictos `<<<<<<<`.
- No hay rutas absolutas locales.
- No hay secretos reales.
- No hay archivos de evidencia o datos personales.
- El README o docs se actualizaron si cambio un flujo.

Comandos utiles:

```bash
rg -n "<<<<<<<|>>>>>>>|======="
rg -n "C:\\\\Users|/home/|localhost:[0-9]+"
git status --short
git diff --check
```

## Reglas de integracion

- `develop` es la rama de integracion.
- `main` debe quedar reservada para entregas aprobadas.
- Cada feature debe tener rama propia y PR.
- No mezclar refactors, cambios visuales y backend en un solo PR salvo que sea una integracion explicitamente documentada.
- Toda migracion debe tener nombre fechable y descripcion clara.

## Flujo funcional minimo que debe seguir funcionando

1. Login como administrador.
2. Gestion de indicadores: buscar, agregar, modificar y eliminar vista local.
3. Gestion de usuarios: agregar, modificar, bloquear/desbloquear y eliminar vista local.
4. Reportes: filtros y generacion basica de reporte.
5. Login como plantel.
6. Captura de indicador.
7. Guardar borrador en backend.
8. Enviar a revision.
9. Healthcheck backend.

## Cuando algo falle

1. Reproducir desde `develop` actualizado.
2. Ejecutar `npm run repo:verify`.
3. Revisar si el fallo es frontend, backend, Docker o configuracion.
4. Corregir en la rama del modulo correspondiente.
5. Agregar evidencia de comandos ejecutados en el PR.

No resolver fallos copiando builds generados, modificando `node_modules` o subiendo `.env`.
