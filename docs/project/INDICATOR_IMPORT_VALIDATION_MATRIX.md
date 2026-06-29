# Matriz de validacion de indicadores oficiales

Fecha de revision: 2026-06-29

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
| Analista | ZIP vigente con 32 archivos: 30 Excel, 1 PDF y 1 DOCX | Cumple |
| Implementador | 14 indicadores operativos visibles y 28 plantillas oficiales tecnicas disponibles desde el paquete vigente | Cumple |
| Validador | Pruebas unitarias, typecheck, build y flujo API por rol despues de los ajustes finales | En verificacion final |

## Reglas de calidad aplicadas

- Los codigos detectados solo en notas o pies de tabla no se crean como indicadores visibles.
- Los indicadores sin libro Excel detallado no inventan columnas del profesor; usan plantilla estructural y quedan documentados como brecha.
- Las fuentes binarias y datos privados permanecen fuera del repositorio.
- El frontend publico no expone rutas de origen ni notas internas de hojas de calculo.
- Las plantillas oficiales tienen al menos una fila inicial, columnas y campos editables.

## Matriz ejecutiva por indicador

| Grupo | Cantidad | Criterio de implementacion | Verificacion |
|---|---:|---|---|
| Indicadores operativos visibles | 14 | Catalogo oficial derivado del ZIP `indicadores-20260622T210134Z-3-001.zip`; formatos internos ocultos | API `/api/v1/indicadores` con Director |
| Formatos con Excel oficial | 28 | Plantilla generada desde encabezados/filas del libro | Auditoria de `/indicadores/:code/template` |
| Libros Excel revisados | 30 | Paquete vigente local, sin versionar binarios | Importador oficial |
| Grupos de evidencia oficial | 30 | Resumen agregado de libros oficiales, sin exponer rutas privadas | Reporte Director |
| Falsos positivos retirados | 0 visibles | `FMT-*`, variantes `*-FMT-*` y notas tipo `La tabla anterior incide...` quedan fuera del flujo operativo | `rg` sobre generados y pruebas unitarias |

## Revision de plantillas visuales 2026-06-29

| Indicador | Hallazgo QA | Correccion aplicada | Veredicto |
|---|---|---|---|
| `3.1.0.0.1` | `Plantel` aparecia duplicado y repetia Bachillerato 16 | Se elimino la columna contextual redundante y se conservaron columnas de participantes | Cumple |
| `3.1.1.3.6` | `Plantel` aparecia duplicado y repetia Bachillerato 16 | Misma regla central de deduplicacion de contexto | Cumple |
| `1.1.2.2.10` | `Plantel` aparecia duplicado y repetia Bachillerato 16 | Misma regla central de deduplicacion de contexto | Cumple |
| `1.1.2.2.11` | `Plantel` aparecia duplicado y repetia Bachillerato 16 | Misma regla central de deduplicacion de contexto | Cumple |
| `4.1.1.0.1` | Encabezado generico `Columna 1` | Se normalizo como `Registro` cuando el Excel no trae encabezado confiable | Cumple |
| `1.0.0.0.2` | `Delegacion` aparecia vacia como columna de solo lectura | Se oculto la columna readonly sin dato oficial y se mantuvo `Plantel`/`Programa Educativo` | Cumple |
| `1.1.2.3.1` | Primera columna vacia y duplicado de `Nombre de la charla` | Se normalizo la columna vacia como `Registro` y se elimino el duplicado sin dato | Cumple |
| `1.1.2.5.10` | No aparecia encabezado de columna cuando `headerRows` venia vacio | El frontend ahora renderiza `columns` cuando no hay encabezados agrupados | Cumple |

## Regresion funcional requerida

- Plantel: login, lista de indicadores, apertura de plantilla, guardar borrador y enviar a revision.
- Responsable: ver solo indicadores asignados, observar y aprobar capturas.
- Director: administrar catalogo, revisar reportes, exportar CSV/PDF y consultar fuentes oficiales.
- Permisos negativos: Plantel no accede a reportes institucionales, no guarda por otro plantel, responsable no asignado no aprueba.
- Exportaciones: CSV/PDF usan el mismo objeto `reporte.indicadores[].datos[]`.

## Veredicto

Los indicadores disponibles en el paquete nuevo quedaron importados de forma reproducible desde `indicadores-20260622T210134Z-3-001.zip`. La validacion final debe confirmar en produccion que Postgres migro a `2026-06-29-template-cleanup-v1` y que la API publica devuelve 14 indicadores operativos visibles, sin formatos internos como indicadores.
