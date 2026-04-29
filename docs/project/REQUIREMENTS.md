# Requerimientos

## Roles

### Plantel

- Captura información de actividades asignadas.
- Adjunta evidencias.
- Consulta estado de revisión.
- Corrige observaciones enviadas por responsables o administración.

### Responsable de indicador

- Consulta actividades e indicadores asignados.
- Revisa capturas de planteles.
- Agrega observaciones.
- Aprueba, rechaza o solicita corrección.
- Consulta reportes de avance de su ámbito.

### Administrador DGEMS

- Administra usuarios, roles, planteles, responsables, indicadores, actividades y periodos.
- Consulta avances globales.
- Exporta reportes institucionales.
- Audita cambios y controla permisos.

## Requerimientos funcionales

### Autenticación y permisos

- Inicio y cierre de sesión.
- Roles `plantel`, `responsable` y `admin`.
- Permisos por plantel, indicador y actividad.
- Recuperación o restablecimiento seguro de contraseña.

### Catálogos

- Planteles.
- Usuarios.
- Responsables y contribuyentes.
- Indicadores POA.
- Actividades asociadas a indicadores.
- Periodos de captura: quincenal, mensual, bimestral y semestral.
- Estados de revisión.

### Captura

- Formularios configurables por indicador o actividad.
- Validaciones por tipo de dato.
- Guardado de borradores.
- Envío formal a revisión.
- Historial de versiones de captura.

### Evidencias

- Carga de archivos permitidos según configuración.
- Metadatos de archivo: nombre, tipo, tamaño, usuario, fecha, actividad y periodo.
- Descarga solo para usuarios autorizados.
- Sustitución controlada cuando una evidencia tenga observaciones.

### Revisión

- Estados mínimos: borrador, enviado, en revisión, corrección solicitada, aprobado y cerrado.
- Observaciones por campo o por captura completa.
- Bitácora de quién revisó y cuándo.
- Bloqueo de edición cuando una captura esté cerrada.

### Dashboard y reportes

- Avance por plantel.
- Avance por indicador.
- Avance por responsable.
- Filtros por periodo, plantel, actividad e indicador.
- Exportación de reportes.
- Indicadores de faltantes, pendientes de revisión y aprobados.

## Requerimientos no funcionales

- Control de acceso basado en roles.
- Segregación de datos por plantel y responsabilidad.
- Bitácora de eventos relevantes.
- Validaciones server-side además de las del frontend.
- Respaldo de base de datos y evidencias.
- Manejo de archivos fuera de Git.
- Configuración por variables de entorno.
- Despliegue reproducible con Docker.

## Modelo conceptual inicial

Entidades principales:

- `User`
- `Role`
- `Plantel`
- `Indicator`
- `Activity`
- `Period`
- `Assignment`
- `Submission`
- `SubmissionVersion`
- `EvidenceFile`
- `Review`
- `AuditLog`

Relaciones clave:

- Un plantel tiene muchas capturas.
- Un indicador tiene muchas actividades.
- Una actividad puede requerir uno o varios campos de captura.
- Un responsable puede revisar varias actividades o indicadores.
- Una captura pertenece a un plantel, actividad y periodo.
- Una captura puede tener muchas evidencias y revisiones.

## Pendientes de definición

- Lista definitiva de planteles activos.
- Stack backend final.
- Proveedor de almacenamiento de archivos.
- Tamaño máximo por evidencia.
- Formatos permitidos por tipo de indicador.
- Política de retención de evidencias.
- Reglas de cierre por periodo.
