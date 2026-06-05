# SCRUM-51, SCRUM-52 y SCRUM-53 - Reportes DGEMS

Este documento fija el contrato actual del modulo de reportes para evitar regresiones al continuar Sprint 3.

## SCRUM-51 - Calculos

Formulas implementadas:

- `estudiantesTotal = estudiantesMujeres + estudiantesHombres`
- `docentesTotal = docentesMujeres + docentesHombres`
- `porcentajeMeta = avance / meta * 100`
- `avancePromedio = promedio simple de avance sobre registros filtrados`
- `porcentajeCumplimiento = aprobados / totalRegistros * 100`

Clasificacion de estados para resumen:

- `faltantes`: `borrador`, `faltante`, `pendiente`
- `enviados`: `enviado`, `en_revision`, `enviada`
- `observados`: `correccion`, `correccion_solicitada`, `observado`
- `aprobados`: `aprobado`, `cerrado`
- `atrasados`: `atrasado` o cualquier registro no aprobado/cerrado con `fechaLimite` vencida

Las pruebas usan una fecha de referencia fija para validar resultados reproducibles.

## SCRUM-52 - Reporte general DGEMS

Endpoint:

```text
GET /api/reportes/general
```

Headers aceptados:

- Compatibilidad local: `x-user-role`, `x-user-plantel-id`, `x-user-responsable-id`
- Compatibilidad API principal: `x-role`, `x-plantel-id`, `x-responsable-id`

Filtros aceptados:

- `ciclo`, `cicloId`, `periodo`, `periodoId`, `plantelId`, `actividadId`, `indicadorId`, `responsableId`, `estado`

La respuesta incluye:

- `resumenGlobal`
- `columnas`
- `datos` filtrados con totales calculados
- `filtros`
- `alcance`

## SCRUM-53 - Exportaciones

Endpoints:

```text
GET /api/reportes/general.pdf
GET /api/reportes/general.csv
GET /api/reportes/general.xls
```

Cada exportacion incluye:

- fecha de generacion
- filtros aplicados
- resumen global
- datos visibles/filtrados

PDF usa `jsPDF` y `jspdf-autotable`. Excel se entrega como XML Spreadsheet compatible con Excel (`.xls`) para no introducir dependencias pesadas.

## Riesgos futuros a vigilar

- Integrar estos endpoints al backend Nest principal cuando `ReportesModule` deje de estar vacio.
- Unificar headers con autenticacion real JWT para no depender de headers demo.
- Sustituir fixtures `AVANCES` por consultas persistentes a capturas reales.
- Mantener pruebas de exportacion activas: antes no fallaban aunque PDF/CSV importaran modulos inexistentes.
- Si se requiere `.xlsx` estricto, agregar una dependencia como `exceljs` y actualizar pruebas.
