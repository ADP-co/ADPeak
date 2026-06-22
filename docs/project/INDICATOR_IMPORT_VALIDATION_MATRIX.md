# Matriz de validacion de indicadores oficiales

Fecha de revision: 2026-06-22

## Alcance validado

Esta matriz documenta el ciclo de tres misiones aplicado a los indicadores importados para SIGI-POA:

- Mision 1, Analista: leer fuente oficial, identificar codigo, nombre, responsable, actividad, alcance de plantel, columnas y estructura de captura.
- Mision 2, Implementador: convertir la fuente a catalogo y plantilla manipulable, sin versionar ZIP, Excel, PDF, DOCX ni datos fuente privados.
- Mision 3, Validador: verificar que el indicador sea visible por rol, tenga plantilla con filas y columnas, permita captura cuando corresponda y respete permisos.

## Fuentes

- `drive-download-20260428T232937Z-3-001.zip`
- `Bachillerato 16-20260424T001029Z-3-001.zip`
- `indicadores-20260622T210134Z-3-001.zip`

Fuentes generadas y versionadas:

- `apps/backend/src/official-catalog.generated.ts`
- `apps/backend/src/official-data.generated.ts`
- `apps/frontend/src/catalog/officialCatalog.generated.ts`
- `apps/frontend/src/catalog/officialData.generated.ts`

## Resultado por mision

| Mision | Evidencia | Resultado |
|---|---|---|
| Analista | 159 filas de catalogo, 108 codigos unicos, 19 responsables, 23 contribuyentes, 128 actividades | Cumple |
| Implementador | 69 libros Excel analizados, 67 plantillas oficiales, fuente nueva integrada de forma aditiva | Cumple |
| Validador | Pruebas unitarias, typecheck, build y flujo API por rol despues de regenerar | En verificacion final |

## Reglas de calidad aplicadas

- Los codigos detectados solo en notas o pies de tabla no se crean como indicadores visibles.
- Los indicadores sin libro Excel detallado no inventan columnas del profesor; usan plantilla estructural y quedan documentados como brecha.
- Las fuentes binarias y datos privados permanecen fuera del repositorio.
- El frontend publico no expone rutas de origen ni notas internas de hojas de calculo.
- Las plantillas oficiales tienen al menos una fila inicial, columnas y campos editables.

## Matriz ejecutiva por indicador

| Grupo | Cantidad | Criterio de implementacion | Verificacion |
|---|---:|---|---|
| Indicadores totales visibles | 108 | Catalogo oficial importado y migrado a produccion `v8` | API `/api/v1/indicadores` con Director |
| Formatos con Excel oficial | 67 | Plantilla generada desde encabezados/filas del libro | Auditoria de `/indicadores/:code/template` |
| Indicadores con alcance de plantel detectado | 39 | Restringidos por `officialIndicatorPlantelScopes` | Pruebas de acceso por Plantel |
| Grupos de evidencia oficial | 81 | Fuentes disponibles para reportes administrativos | Reporte Director |
| Falsos positivos retirados | 0 visibles | Notas tipo `La tabla anterior incide...` quedan fuera de catalogo y plantillas | `rg` sobre generados |

## Regresion funcional requerida

- Plantel: login, lista de indicadores, apertura de plantilla, guardar borrador y enviar a revision.
- Responsable: ver solo indicadores asignados, observar y aprobar capturas.
- Director: administrar catalogo, revisar reportes, exportar CSV/PDF y consultar fuentes oficiales.
- Permisos negativos: Plantel no accede a reportes institucionales, no guarda por otro plantel, responsable no asignado no aprueba.
- Exportaciones: CSV/PDF usan el mismo objeto `reporte.indicadores[].datos[]`.

## Veredicto

Los indicadores disponibles en el paquete nuevo quedaron importados de forma reproducible junto con Bachillerato 16. La validacion final debe confirmar en produccion que Postgres migro a `v8` y que la API publica ya devuelve los 108 indicadores.
