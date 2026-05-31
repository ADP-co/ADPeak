# Plan de pruebas por rol

Este plan cubre los roles `plantel`, `responsable` y `admin` para validar permisos, pantallas, endpoints y reportes del sistema SIGI-POA DGEMS. Los casos usan datos ficticios; no se deben usar evidencias, Excel, PDFs ni datos personales reales.

## Datos de prueba

| Dato | Valor ficticio | Uso |
| --- | --- | --- |
| Usuario plantel | `plantel.demo@sigi.test` | Captura y consulta de indicadores propios. |
| Usuario responsable | `responsable.demo@sigi.test` | Revision de planteles asignados. |
| Usuario admin | `admin.demo@sigi.test` | Administracion global. |
| Plantel | `Plantel Demo 01` | Entidad de prueba para capturas. |
| Indicador | `1.1.0.0.1` | Indicador de prueba con actividad asociada. |
| Periodo | `2026-P1` | Periodo operativo de prueba. |
| Evidencia falsa | `evidencia-demo.pdf` | Archivo minimo sin datos reales. |

## Matriz de casos

| ID | Nivel | Rol | Cobertura | Caso | Pasos | Datos esperados | Resultado esperado | Resultado | Responsable de correccion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-PL-01 | Unitario | Plantel | Permisos | Validar que el rol plantel solo tenga permisos de captura propia. | 1. Cargar permisos del usuario plantel. 2. Evaluar permisos sobre indicadores propios y ajenos. | Permisos `read:self`, `write:self`; sin permisos administrativos. | Autoriza datos propios y rechaza datos de otros planteles. | Pendiente de ejecucion | Backend/API |
| QA-PL-02 | Integracion | Plantel | Endpoints | Crear captura de indicador. | 1. Autenticarse como plantel. 2. Enviar captura para indicador asignado. 3. Consultar captura creada. | Indicador `1.1.0.0.1`, periodo `2026-P1`, avance numerico valido. | API guarda la captura y devuelve confirmacion sin exponer datos ajenos. | Pendiente de ejecucion | Backend/API |
| QA-PL-03 | Integracion | Plantel | Endpoints | Rechazar captura con campos obligatorios faltantes. | 1. Autenticarse como plantel. 2. Enviar captura sin avance o periodo. | Payload incompleto. | API responde error claro de validacion. | Pendiente de ejecucion | Backend/API |
| QA-PL-04 | End-to-end | Plantel | Pantallas | Navegar vista general de plantel. | 1. Ingresar como plantel. 2. Validar dashboard. 3. Abrir indicadores disponibles. | Plantel Demo 01 con indicadores asignados. | Se muestran secciones, indicadores y estados correctos. | Pendiente de ejecucion | Frontend |
| QA-PL-05 | End-to-end | Plantel | Pantallas | Capturar avance y adjuntar evidencia falsa. | 1. Abrir indicador. 2. Completar formulario. 3. Adjuntar evidencia falsa. 4. Guardar. | `evidencia-demo.pdf`, avance valido, comentario ficticio. | La captura queda registrada y visible para seguimiento. | Pendiente de ejecucion | Frontend |
| QA-RE-01 | Unitario | Responsable | Permisos | Validar alcance de responsable. | 1. Cargar permisos del responsable. 2. Consultar planteles asignados y no asignados. | Responsable con asignacion al Plantel Demo 01. | Autoriza planteles asignados y rechaza no asignados. | Pendiente de ejecucion | Backend/API |
| QA-RE-02 | Integracion | Responsable | Endpoints | Consultar capturas de planteles asignados. | 1. Autenticarse como responsable. 2. Consultar capturas pendientes. | Captura enviada por Plantel Demo 01. | API devuelve solo capturas dentro de su responsabilidad. | Pendiente de ejecucion | Backend/API |
| QA-RE-03 | Integracion | Responsable | Endpoints | Aprobar o regresar captura. | 1. Abrir captura enviada. 2. Aprobarla. 3. Repetir con otra captura y regresarla con comentario. | Capturas con estados `submitted`. | Cambia estado a `approved` o `needs_correction` y registra comentario. | Pendiente de ejecucion | Backend/API |
| QA-RE-04 | End-to-end | Responsable | Pantallas | Revisar bandeja de planteles e indicadores. | 1. Ingresar como responsable. 2. Abrir seccion de planteles. 3. Revisar progreso. | Planteles e indicadores asignados. | La pantalla muestra progreso, estados y acciones de revision. | Pendiente de ejecucion | Frontend |
| QA-RE-05 | End-to-end | Responsable | Reportes | Generar reporte de avance asignado. | 1. Ir a reportes. 2. Filtrar por periodo e indicador. 3. Generar reporte. | Periodo `2026-P1`, indicador `1.1.0.0.1`. | Reporte muestra datos precisos del alcance del responsable. | Pendiente de ejecucion | Reportes |
| QA-AD-01 | Unitario | Admin | Permisos | Validar permisos administrativos. | 1. Cargar permisos admin. 2. Evaluar gestion de usuarios, catalogos y reportes. | Rol `admin`. | Autoriza administracion global y acciones de configuracion. | Pendiente de ejecucion | Backend/API |
| QA-AD-02 | Integracion | Admin | Endpoints | Crear, editar y desactivar usuarios. | 1. Autenticarse como admin. 2. Crear usuario plantel. 3. Editarlo. 4. Desactivarlo. | Usuarios ficticios de plantel, responsable y admin. | API persiste cambios, valida roles y evita duplicados. | Pendiente de ejecucion | Backend/API |
| QA-AD-03 | Integracion | Admin | Endpoints | Administrar indicadores y asignaciones. | 1. Crear indicador ficticio. 2. Asignar responsable y plantel. 3. Consultar asignacion. | Indicador y plantel ficticios. | El catalogo queda consistente y consultable. | Pendiente de ejecucion | Backend/API |
| QA-AD-04 | End-to-end | Admin | Pantallas | Gestionar usuarios desde interfaz. | 1. Ingresar como admin. 2. Abrir gestion de usuarios. 3. Crear o modificar usuario ficticio. | Usuario `plantel.demo@sigi.test`. | Interfaz confirma cambios y actualiza la lista. | Pendiente de ejecucion | Frontend |
| QA-AD-05 | End-to-end | Admin | Reportes | Exportar reporte global. | 1. Ir a reportes. 2. Filtrar por periodo, plantel e indicador. 3. Exportar tabla/PDF. | Datos ficticios de avance. | Archivo se genera correctamente y contiene datos filtrados. | Pendiente de ejecucion | Reportes |
| QA-SEC-01 | Integracion | Todos | Permisos | Rechazar credenciales invalidas. | 1. Intentar login con password incorrecto. 2. Intentar acceder a recurso protegido sin token. | Credenciales ficticias invalidas. | API responde error claro y no entrega datos protegidos. | Pendiente de ejecucion | Backend/API |
| QA-SEC-02 | End-to-end | Todos | Sesion | Cerrar sesion de forma segura. | 1. Ingresar con cada rol. 2. Cerrar sesion. 3. Intentar navegar a vista protegida. | Sesion activa por rol. | La sesion queda invalidada y se redirige a login. | Pendiente de ejecucion | Frontend |
| QA-REP-01 | Integracion | Admin/Responsable | Reportes | Validar datos base del reporte. | 1. Preparar capturas ficticias. 2. Generar reporte por endpoint. 3. Comparar totales y filtros. | Capturas aprobadas y pendientes. | El reporte respeta filtros y no mezcla alcances de rol. | Pendiente de ejecucion | Reportes |

## Criterios de salida

- Todos los casos criticos de autenticacion, permisos y segregacion de datos deben quedar en estado `Aprobado`.
- Cualquier caso `Fallido` debe registrar evidencia, causa probable y responsable de correccion.
- Los casos de reportes deben comparar totales contra datos de prueba conocidos.
- Los casos de evidencia deben usar archivos falsos y minimos, nunca documentos reales.

## Registro de ejecucion

Al ejecutar una ronda de QA, actualizar la columna `Resultado` con uno de estos valores:

- `Aprobado`
- `Fallido`
- `Bloqueado`
- `No aplica`

Cada fallo debe abrir o referenciar un ticket con el rol afectado, pasos de reproduccion, evidencia no sensible y responsable de correccion.
