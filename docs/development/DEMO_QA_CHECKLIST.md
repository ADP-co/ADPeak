# Checklist final de demo

Este checklist cierra la evidencia de `SCRUM-70` y `SCRUM-71` para la demo
local de Sprint 3. Solo usa datos ficticios del modo demo.

## Recorrido principal

| Rol | Flujo validado | Resultado esperado |
| --- | --- | --- |
| Plantel | Iniciar sesion, capturar avance, adjuntar evidencia ficticia y enviar a revision | Se registra una accion demo con folio de auditoria. |
| Responsable | Iniciar sesion, revisar avances asignados, solicitar correccion y aprobar | Solo ve registros de su responsable asignado. |
| Administrador DGEMS | Ver dashboard global, filtrar datos y descargar CSV | Ve todos los registros demo y metricas filtradas. |

## Datos y accesos

| Elemento | Criterio |
| --- | --- |
| Frontend | `http://127.0.0.1:5173` responde y muestra conexion API. |
| Backend | `http://127.0.0.1:8000/health` responde `ok`. |
| Dataset | `/demo/data` expone ciclos, periodos, planteles, indicadores, actividades, responsables y estados. |
| Login demo | `/demo/login` funciona con los tres usuarios ficticios. |
| Acciones demo | `/demo/action` rechaza acciones fuera del rol y devuelve folio para acciones permitidas. |
| Reporte | `/demo/report.csv` descarga el reporte basico con filtros aplicables desde UI. |

## Bugs y cierre

| Severidad | Incidencia | Estado |
| --- | --- | --- |
| Bloqueante | Frontend podia quedar como cascaron visual si backend no estaba activo | Corregido con validacion visible de API y guia de arranque. |
| Alta | Dashboard no tenia filtros por todas las dimensiones requeridas | Corregido con filtros reactivos y metricas recalculadas. |
| Alta | No habia acciones verificables para captura, revision, correccion y aprobacion | Corregido con endpoint `/demo/action` y botones por rol. |
| Media | No habia descarga de reporte basico desde backend demo | Corregido con `/demo/report.csv`. |
| Media | No existia checklist final de demo versionado | Corregido con este documento. |

## Comandos obligatorios antes de presentar

```bash
npm run demo:check
npm run demo:validate-access
npm run build
npm test
npm run demo:up
```

Despues de la revision visual, detener el entorno:

```bash
npm run demo:down
```
