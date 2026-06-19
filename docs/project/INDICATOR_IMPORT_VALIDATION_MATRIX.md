# Matriz de validacion de indicadores oficiales

Fecha de revision: 2026-06-19

## Alcance validado

Esta matriz documenta el ciclo de tres misiones aplicado a los indicadores importados para SIGI-POA:

- Mision 1, Analista: leer fuente oficial, identificar codigo, nombre, responsable, actividad, alcance de plantel, columnas y estructura de captura.
- Mision 2, Implementador: convertir la fuente a catalogo y plantilla manipulable, sin versionar los ZIP, Excel ni datos fuente privados.
- Mision 3, Validador: verificar que el indicador sea visible por rol, tenga plantilla con filas y columnas, permita captura cuando corresponda y respete permisos.

## Fuentes

- Google Drive `1oDfIBw4A9443XppW0_hl4PWqLnyEwSTs`: no visible para la cuenta conectada. El conector devolvio carpeta vacia y metadatos `404 File not found`.
- Copia local reproducible: `drive-download-20260428T232937Z-3-001.zip`, `Bachillerato 16-20260424T001029Z-3-001.zip` e `indicadores-20260428T232925Z-3-001.zip`.
- Fuentes generadas y versionadas:
  - `apps/backend/src/official-catalog.generated.ts`
  - `apps/backend/src/official-data.generated.ts`
  - `apps/frontend/src/catalog/officialCatalog.generated.ts`
  - `apps/frontend/src/catalog/officialData.generated.ts`

## Resultado por mision

| Mision | Evidencia | Resultado |
|---|---|---|
| Analista | 147 filas de catalogo, 96 codigos unicos, 19 responsables, 23 contribuyentes, 116 actividades | Cumple |
| Implementador | 52 libros Excel analizados, 52 plantillas oficiales, 44 indicadores de `Libro1.xlsx` cubiertos por plantilla estructural | Cumple con brecha documentada |
| Validador | Produccion: Plantel y Director ven 96 indicadores; Responsable `resp18` ve 47 asignados; fallos de plantilla `0` | Cumple |

## Reglas de calidad aplicadas

- Los codigos detectados solo en notas o pies de tabla no se crean como indicadores visibles.
- Los indicadores sin libro Excel detallado no inventan columnas del profesor; usan plantilla estructural con campos capturables y quedan documentados como brecha.
- Las fuentes binarias y datos privados permanecen fuera del repositorio.
- El frontend publico no expone rutas de origen ni notas internas de hojas de calculo.
- Las plantillas oficiales tienen al menos una fila inicial, columnas y campos editables.

## Matriz ejecutiva por indicador

| Grupo | Cantidad | Criterio de implementacion | Verificacion |
|---|---:|---|---|
| Indicadores totales visibles | 96 | Catalogo oficial importado y migrado a produccion `v7` | API publica `/api/v1/indicadores` con Director |
| Formatos con Excel oficial | 52 | Plantilla generada desde encabezados/filas del libro | Auditoria de `/indicadores/:code/template` |
| Indicadores de `Libro1.xlsx` sin Excel detallado | 44 | Plantilla estructural, sin inventar tabla especifica | Auditoria de visibilidad y captura por Plantel |
| Indicadores con alcance de plantel detectado | 39 | Restringidos por `officialIndicatorPlantelScopes` | Pruebas de acceso por Plantel |
| Falsos positivos retirados | 4 | Codigos de notas `La tabla anterior incide...` solo quedan como referencias | API publica con `badPhrase = 0` |

## Regresion funcional publica

URL validada: `https://adpeak-sigi-poa.vercel.app/login`

| Flujo | Evidencia | Resultado |
|---|---|---|
| Plantel | `bach16` ve 96 indicadores y 0 plantillas fallidas | Cumple |
| Responsable | `resp18` ve 47 indicadores asignados y 0 plantillas fallidas | Cumple |
| Director | `director` ve 96 indicadores y 0 plantillas fallidas | Cumple |
| Captura | Plantel crea borrador, guarda y envia a revision | Cumple |
| Revision | Responsable observa, Plantel corrige, Responsable aprueba | Cumple |
| Reportes | Director ve captura aprobada con detalle completo | Cumple |
| Exportaciones | CSV y PDF descargan desde la web sin errores de consola/red | Cumple |
| Permisos | Plantel no accede a reportes, no guarda por otro plantel, responsable no asignado no aprueba | Cumple |

## Evidencia automatizada reciente

- `npm run check`: typecheck, pruebas frontend, 45 pruebas backend y build pasaron.
- Auditoria API publica:
  - Plantel `bach16`: 96 indicadores, fallos `0`.
  - Director `director`: 96 indicadores, fallos `0`.
  - Responsable `resp18`: 47 indicadores, fallos `0`.
- Auditoria de reportes:
  - Captura aprobada reportable: `reportHits = 1`, estado `Aprobado`, detalle `10`.
  - Descargas web: `reporte-bachillerato-1-2026-2.csv` y `reporte-bachillerato-1-2026-2.pdf`.

## Veredicto

Los indicadores disponibles en las fuentes locales verificables quedaron importados, filtrados y validados. La unica brecha externa es el acceso directo al folder de Google Drive, que no esta disponible para la cuenta conectada; si ese folder contiene archivos adicionales no incluidos en los ZIP locales, se requiere compartirlos o descargarlos para una nueva importacion.
