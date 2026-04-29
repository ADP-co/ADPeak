# Plan de Acción

Este es el plan editable del proyecto. El PDF original queda solo como referencia histórica; las decisiones vigentes deben actualizarse aquí.

## Fase 0: Alineación y alcance

Objetivo: convertir los documentos fuente en backlog técnico claro.

Entregables:

- Confirmar alcance del MVP.
- Consolidar catálogo inicial de indicadores, actividades, responsables y periodos.
- Definir stack final.
- Definir políticas de manejo de evidencias.
- Crear issues por módulo.

Criterio de salida:

- El equipo puede empezar desarrollo sin depender de archivos Excel como fuente ambigua.

## Fase 1: Base técnica

Objetivo: dejar el proyecto listo para desarrollo colaborativo.

Entregables:

- Estructura del frontend y backend.
- Configuración de variables de entorno.
- Docker local.
- Base de datos y migraciones.
- Linting, formato y validaciones básicas.
- Plantillas de Pull Request e issues.

Criterio de salida:

- Cualquier integrante puede levantar el proyecto localmente siguiendo el README técnico.

## Fase 2: Autenticación y RBAC

Objetivo: proteger el sistema antes de manejar información real.

Entregables:

- Login y logout.
- Roles `plantel`, `responsable` y `admin`.
- Middleware o guards de autorización.
- Usuarios de prueba por rol.
- Pruebas de acceso a rutas protegidas.

Criterio de salida:

- Cada rol ve solo las pantallas y datos que le corresponden.

## Fase 3: Catálogo POA

Objetivo: modelar la estructura institucional del POA.

Entregables:

- CRUD de planteles.
- CRUD de indicadores.
- CRUD de actividades.
- Asignación de responsables y contribuyentes.
- Administración de periodos de captura.
- Importación inicial controlada desde el libro maestro.

Criterio de salida:

- El sistema contiene el catálogo mínimo necesario para capturar avances.

## Fase 4: Captura y evidencias

Objetivo: permitir que planteles registren avances con soporte documental.

Entregables:

- Formularios por actividad.
- Validaciones por tipo de dato.
- Guardado de borrador.
- Envío a revisión.
- Carga privada de evidencias.
- Metadatos y trazabilidad de archivos.

Criterio de salida:

- Un plantel puede completar una actividad y enviarla con evidencias.

## Fase 5: Revisión y correcciones

Objetivo: reemplazar la revisión manual de carpetas por un flujo controlado.

Entregables:

- Bandeja de revisión para responsables.
- Estados de captura.
- Observaciones.
- Solicitud de corrección.
- Aprobación y cierre.
- Bitácora de eventos.

Criterio de salida:

- Un responsable puede validar capturas sin editar directamente los datos del plantel.

## Fase 6: Dashboard y reportes

Objetivo: dar visibilidad operativa a DGEMS.

Entregables:

- Tablero de avance por plantel, indicador, responsable y periodo.
- Filtros principales.
- Métricas de pendientes, enviados, observados y aprobados.
- Exportación de reportes.
- Vista administrativa global.

Criterio de salida:

- Administración puede identificar faltantes y avances sin revisar carpetas manualmente.

## Fase 7: Seguridad, pruebas y despliegue

Objetivo: preparar el sistema para uso institucional.

Entregables:

- Pruebas de permisos.
- Pruebas de carga y descarga de evidencias.
- Revisión de datos sensibles.
- Respaldo y recuperación.
- Configuración de ambiente de demo o producción.
- Guía de operación.

Criterio de salida:

- El sistema puede demostrarse con datos controlados y sin exponer información confidencial.

## Backlog inicial por prioridad

| Prioridad | Módulo | Resultado |
| --- | --- | --- |
| P0 | Seguridad de repositorio | Evitar filtración de fuentes y evidencias |
| P0 | Autenticación/RBAC | Acceso segmentado por rol |
| P0 | Catálogo POA | Indicadores, actividades, planteles y periodos |
| P0 | Captura | Registro de avances por plantel |
| P1 | Evidencias | Archivos privados con metadatos |
| P1 | Revisión | Observaciones, aprobación y corrección |
| P1 | Dashboard | Seguimiento por filtros clave |
| P2 | Exportaciones | Reportes PDF/Excel |
| P2 | Auditoría avanzada | Bitácora completa y análisis de cambios |
