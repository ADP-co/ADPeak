# Auditoria de importacion oficial de indicadores

Fecha de revision: 2026-06-22

## Fuente revisada

- `drive-download-20260428T232937Z-3-001.zip`: contiene `Libro1.xlsx`, `SIGI-POA DGEMS 2026.docx` y el paquete de evidencias de Bachillerato 16.
- `Bachillerato 16-20260424T001029Z-3-001.zip`: contiene evidencias y 39 libros Excel de apoyo para plantillas por plantel.
- `indicadores-20260622T210134Z-3-001.zip`: paquete nuevo entregado por el equipo, con 30 libros Excel de formatos oficiales, 1 PDF y 1 DOCX.

El conector de Google Drive habia devuelto la carpeta original sin archivos visibles para la cuenta conectada. Con el ZIP nuevo local se desbloqueo la importacion reproducible sin versionar binarios ni documentos fuente.

## Resultado importado

- 32 archivos revisados desde `indicadores-20260622T210134Z-3-001.zip`.
- 30 libros Excel, 1 PDF y 1 DOCX detectados en el paquete vigente.
- 28 codigos visibles de indicador disponibles en la aplicacion.
- 28 plantillas manipulables generadas desde hojas oficiales.
- 30 resumenes de libros/fuentes oficiales disponibles para auditoria interna.
- Version de migracion actual: `2026-06-23-indicadores-zip-only-v1`.

## Controles de calidad

- Los codigos detectados solo en notas, pies de tabla o referencias del tipo `La tabla anterior incide...` no se crean como indicadores visibles.
- El importador rechaza escritura si detecta mojibake o caracteres rotos en los archivos generados.
- Las fuentes binarias, PDFs, DOCX, Excel y datos privados permanecen fuera del repositorio.
- La app usa las plantillas oficiales cuando existe estructura de Excel, y mantiene una plantilla estructural para catalogos oficiales sin formato detallado.
- Los indicadores oficiales sin plantel explicito quedan configurables sin inventar alcance; el plantel activo puede guardar capturas propias, y el Director puede restringir alcance manualmente.

## Brecha documentada

El paquete vigente incluye formatos con codigo oficial directo y tambien variantes detectadas desde nombres de archivos u hojas. Las variantes tecnicas `FMT-*` y `*-FMT-*` no deben tratarse como codigos finales del profesor en comunicacion externa; se conservan solo cuando el sistema necesita distinguir una plantilla importada que todavia no tiene mapeo oficial unico.

Esta brecha no bloquea operacion, pero debe resolverse en una normalizacion posterior separando formalmente `indicador oficial` de `variante de formato` para evitar duplicados visuales.

## Decision aplicada

- El paquete `indicadores-20260622T210134Z-3-001.zip` reemplaza al paquete anterior como fuente principal de formatos visibles.
- No se versionan ZIP, Excel, PDF, DOCX ni evidencias fuente.
- La migracion de catalogo vigente es `2026-06-23-indicadores-zip-only-v1` para que produccion regenere indicadores oficiales y retire imports obsoletos.
