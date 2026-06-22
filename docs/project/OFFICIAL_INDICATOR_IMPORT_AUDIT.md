# Auditoria de importacion oficial de indicadores

Fecha de revision: 2026-06-22

## Fuente revisada

- `drive-download-20260428T232937Z-3-001.zip`: contiene `Libro1.xlsx`, `SIGI-POA DGEMS 2026.docx` y el paquete de evidencias de Bachillerato 16.
- `Bachillerato 16-20260424T001029Z-3-001.zip`: contiene evidencias y 39 libros Excel de apoyo para plantillas por plantel.
- `indicadores-20260622T210134Z-3-001.zip`: paquete nuevo entregado por el equipo, con 30 libros Excel de formatos oficiales, 1 PDF y 1 DOCX.

El conector de Google Drive habia devuelto la carpeta original sin archivos visibles para la cuenta conectada. Con el ZIP nuevo local se desbloqueo la importacion reproducible sin versionar binarios ni documentos fuente.

## Resultado importado

- 99 filas fisicas desde `Libro1.xlsx`.
- 159 filas totales de catalogo despues de agregar formatos que solo aparecen en libros Excel.
- 148 filas unicas trazables.
- 108 codigos unicos de indicador disponibles en la aplicacion.
- 19 responsables y 23 contribuyentes.
- 128 actividades detectadas.
- 69 libros Excel analizados.
- 67 plantillas manipulables generadas desde hojas oficiales.
- 39 indicadores con alcance de plantel detectado desde evidencias.
- 81 grupos de evidencias/fuentes oficiales para reportes.

## Controles de calidad

- Los codigos detectados solo en notas, pies de tabla o referencias del tipo `La tabla anterior incide...` no se crean como indicadores visibles.
- El importador rechaza escritura si detecta mojibake o caracteres rotos en los archivos generados.
- Las fuentes binarias, PDFs, DOCX, Excel y datos privados permanecen fuera del repositorio.
- La app usa las plantillas oficiales cuando existe estructura de Excel, y mantiene una plantilla estructural para catalogos oficiales sin formato detallado.
- Los indicadores oficiales sin plantel explicito quedan configurables sin inventar alcance; el plantel activo puede guardar capturas propias, y el Director puede restringir alcance manualmente.

## Brecha documentada

De los 48 codigos base de `Libro1.xlsx`, 7 tienen plantilla asociada directamente por codigo oficial en los paquetes Excel actuales. Los demas siguen disponibles como indicadores oficiales con responsable, contribuyente y actividad base, pero su captura queda en plantilla estructural hasta que se proporcione un formato Excel especifico por codigo.

Esta brecha no bloquea operacion: evita inventar columnas del profesor y permite que el Director configure o ajuste el formato cuando reciba la hoja oficial correspondiente.

## Decision aplicada

- El paquete `indicadores-20260622T210134Z-3-001.zip` reemplaza al paquete anterior de 13 libros como fuente principal de formatos.
- Bachillerato 16 se mantiene de forma aditiva porque contiene 39 libros adicionales de evidencia/plantilla que no vienen en el ZIP nuevo.
- La migracion de catalogo sube a `2026-06-22-official-indicators-v8` para que produccion en Postgres regenere indicadores oficiales y retire imports obsoletos.
