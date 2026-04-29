# Matriz de Preguntas y Respuestas

Esta matriz cruza las dudas de reunión contra las fuentes revisadas: documento base SIGI-POA, libro maestro, formatos Excel de indicadores, inventario de evidencias, action plan visual y documentación actual del repositorio.

Estados:

- **Confirmado**: aparece en una fuente o fue confirmado por el equipo.
- **Inferible**: no está escrito de forma final, pero se deduce con suficiente fuerza para proponerlo.
- **Abierto**: debe preguntarse a DGEMS.

## Dudas críticas

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Nombre oficial del sistema | Inferible | El DOCX dice `SIGI-POA DGEMS 2026`; para futuros años conviene usar `SIGI-POA DGEMS` como nombre oficial y `ADPeak` solo como nombre interno. Confirmar redacción final. |
| ¿Solo 2026 o futuros años? | Confirmado | Debe iniciar con POA 2026 y soportar futuros ciclos anuales. |
| MVP esperado primero | Inferible | Para demo: autenticación/RBAC, catálogo POA, captura con evidencia, revisión básica y dashboard mínimo. El alcance exacto de demo sigue abierto. |
| Fecha de demo funcional | Confirmado | 31 de mayo de 2026. |
| Autoridad final de requisitos/cambios | Inferible | Administrador DGEMS. Falta identificar persona o cargo específico. |

## Usuarios y permisos

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| ¿Cuántos planteles usarán el sistema? | Inferible | El action plan visual menciona directores de 38 planteles. Debe confirmarse. |
| ¿Cuántos usuarios por plantel? | Abierto | No está definido. Mínimo lógico: un usuario capturista/directivo por plantel. |
| Usuarios exactos DGEMS | Inferible | El action plan visual menciona 8-9 trabajadores DGEMS; roles base: administrador y responsables de indicador. Falta confirmar revisores/capturistas internos. |
| ¿Usuario con más de un plantel o rol? | Abierto | El modelo debería soportarlo por flexibilidad, pero la política no está definida. |
| ¿Responsable ve todos o solo asignados? | Inferible | Debe ver solo indicadores/actividades asignadas; administrador ve global. Confirmar excepciones. |
| ¿Admin edita capturas de planteles? | Inferible | Lo correcto es que admin revise/administre, no modifique datos enviados; cualquier edición directa requeriría auditoría. Confirmar política. |

## Flujo de trabajo

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Flujo oficial de captura | Inferible | Propuesto: borrador, enviado, en revisión, corrección solicitada, aprobado, cerrado. |
| ¿Quién devuelve con observaciones? | Inferible | Responsable de indicador y/o Administrador DGEMS. Confirmar permisos exactos. |
| ¿Plantel edita después de enviar? | Inferible | No debería editar libremente; solo si se solicita corrección o si el periodo sigue abierto. |
| ¿Qué pasa si no entrega a tiempo? | Abierto | Falta definir atrasos, alertas, bloqueo y escalamiento. |
| ¿Fechas de apertura/cierre por periodo? | Inferible | El sistema requiere periodos; reglas de apertura/cierre siguen abiertas. |
| ¿Historial/versionado por captura? | Confirmado | El action plan menciona control de versiones y las fuentes piden trazabilidad. |

## Indicadores y formularios

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| ¿Libro1.xlsx es fuente oficial? | Inferible | Es el libro maestro recibido con columnas de indicador, responsable, contribuyente y actividad. Debe validarse como fuente oficial inicial. |
| ¿99 actividades y 48 indicadores son definitivos? | Abierto | Son los conteos observados; no se sabe si son definitivos. |
| ¿Cargar los 48 indicadores desde el inicio? | Inferible | Para producto completo sí; para demo puede usarse un subconjunto representativo. Confirmar alcance de demo. |
| ¿Formulario por indicador o configurable? | Inferible | Conviene usar formularios configurables por actividad/indicador; evita recrear pantallas por cada Excel. |
| ¿Quién define campos obligatorios? | Abierto | Debe definirlo DGEMS, probablemente Administrador DGEMS con responsables de indicador. |
| ¿Excel actuales son finales o referencias? | Abierto | Deben tratarse como referencia hasta validación formal de DGEMS. |
| Validaciones por campo | Inferible | Números, porcentajes, fechas/periodos, texto, totales, participantes y evidencias obligatorias según indicador. Falta especificación por formulario. |

## Evidencias

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Tipos de archivo permitidos | Inferible | Las fuentes tienen PDF, XLSX, imágenes, DOCX y PPTX. Para seguridad conviene permitir solo tipos aprobados por DGEMS. |
| Tamaño máximo por archivo | Abierto | No está definido. El archivo de evidencias demuestra que habrá muchos archivos y algunos pesados. |
| Evidencias por actividad | Inferible | Debe soportar múltiples evidencias por plantel/actividad/periodo. Falta límite. |
| ¿Reemplazo o versiones? | Inferible | Por trazabilidad, reemplazos deben conservar versión o bitácora; no sobrescritura silenciosa. |
| ¿Quién descarga evidencias? | Inferible | Plantel dueño, responsable asignado y administrador. Confirmar excepciones. |
| Tiempo de conservación | Abierto | No está definido. |
| Documentos que no deberían subirse | Inferible | Deben restringirse o tratarse con cuidado documentos con datos personales, resultados de admisión, constancias, números de cuenta y certificados. |

## Reportes y dashboard

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Reportes que necesita DGEMS | Inferible | Avance por plantel, indicador, actividad, periodo y responsable. Reportes exactos siguen abiertos. |
| Exportación PDF/Excel | Inferible | Recomendado y documentado como propuesta; confirmar formato oficial. |
| Filtros obligatorios | Confirmado parcial | Fuente menciona periodo, plantel y actividad. Por lógica agregar año, indicador, responsable y estado. |
| Métricas importantes | Inferible | Avance, faltantes, enviados, en revisión, observados, aprobados y atrasados. Prioridad exacta abierta. |
| Reportes separados por rol | Inferible | Sí: responsables ven su ámbito; administrador ve global. |
| Reporte final consolidado | Inferible | El objetivo de reportes estratégicos apunta a un consolidado final, pero formato abierto. |

## Datos sensibles y seguridad

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Datos personales manejados | Confirmado parcial | Las evidencias y algunos formatos incluyen o pueden incluir nombres, números de cuenta, resultados, constancias y documentos académicos. |
| ¿Guardar nombres/números/resultados? | Abierto | Algunos formatos lo piden, pero debe validarse política de privacidad y minimización de datos. |
| Política institucional de privacidad | Abierto | No está disponible en las fuentes revisadas. |
| Tipo de autenticación | Abierto | No se define si será institucional, correo UCOL, Microsoft/Google o usuario/contraseña propio. |
| Bitácora de accesos, descargas y cambios | Inferible | Cambios y revisiones sí por trazabilidad; descargas también debería registrarse por sensibilidad. |
| ¿Quién autoriza usuarios? | Inferible | Administrador DGEMS. Confirmar si habrá aprobación adicional. |

## Infraestructura

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| ¿Dónde alojar el sistema? | Abierto | No hay definición: servidor institucional, nube o hosting propio. |
| ¿Quién administra DB y respaldos? | Abierto | No está definido. |
| Stack obligatorio | Abierto | Hay stack propuesto por el equipo, pero no confirmación institucional. |
| Docker o despliegue manual | Inferible | Docker está propuesto para desarrollo reproducible; confirmar si aplica en despliegue. |
| ¿Red institucional o internet? | Abierto | No está definido. |

## Operación

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Soporte a planteles | Abierto | No definido. |
| Carga inicial de catálogos | Inferible | Equipo técnico puede importar; Administrador DGEMS debe validar. |
| Capacitación a planteles | Abierto | No definida, pero probablemente necesaria. |
| Manual de usuario | Inferible | Debería existir para operación institucional. |
| Cambio de indicador durante el año | Inferible | Debe versionarse o desactivarse sin romper capturas históricas. |
| Cierre oficial de periodo | Inferible | Administrador DGEMS. Confirmar si responsables pueden cerrar su ámbito. |

## Preguntas estratégicas

| Pregunta | Estado | Respuesta actual |
| --- | --- | --- |
| Éxito de primera versión | Inferible | Que admin configure catálogos/año, plantel capture con evidencia, responsable revise y admin vea avance. Confirmar demo mínima. |
| Tres funciones indispensables | Inferible | RBAC, catálogo POA y captura/revisión con evidencia. Dashboard mínimo debe incluirse si la demo requiere valor visible. |
| Información que jamás debe estar | Inferible | Credenciales, ZIPs crudos, datos fuera de alcance del POA y documentos personales no necesarios. La evidencia real solo en almacenamiento privado autorizado. |
| Revisión semanal | Abierto | Falta definir responsable y frecuencia. |
| Responsable funcional disponible | Abierto | Debe solicitarse en reunión. |
