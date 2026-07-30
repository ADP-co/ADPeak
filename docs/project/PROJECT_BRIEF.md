# Resumen del Proyecto

## Nombre

SIGI-POA DGEMS: Sistema Integral de Gestión de Indicadores del Programa Operativo Anual.

## Contexto

DGEMS necesita recopilar, dar seguimiento y analizar avances de indicadores del POA. El ciclo inicial será 2026, pero el sistema debe quedar preparado para futuros años. El proceso actual depende de hojas de cálculo y carpetas distribuidas, lo que dificulta la revisión, genera duplicidad de información, expone datos sensibles y retrasa la toma de decisiones.

El sistema debe convertir ese flujo en una plataforma web centralizada, con permisos por rol, formularios estructurados, evidencias controladas, trazabilidad y reportes.

## Decisiones confirmadas

- Nombre oficial: SIGI-POA DGEMS.
- Nombre interno del equipo: ADPeak.
- Alcance temporal: iniciar con POA 2026 y soportar ciclos anuales futuros.
- Primera demo funcional: 31 de mayo de 2026.
- Autoridad funcional esperada: Administrador DGEMS.

## Fuentes revisadas

Las fuentes confidenciales revisadas están almacenadas en el repositorio privado del equipo. No se copian en este repositorio público.

Resumen operativo de las fuentes:

- Documento base del sistema con problemática, objetivo, justificación y listado de indicadores.
- Libro maestro con 99 registros de actividades, 48 códigos de indicadores únicos y asignación de responsables/contribuyentes.
- Trece formatos Excel de captura por indicador o actividad.
- Archivo documental de evidencia de un plantel con 981 archivos, aproximadamente 1.05 GB, principalmente PDFs de evidencia, hojas Excel e imágenes.
- Plan visual inicial del equipo, archivado como referencia en este repositorio.

## Problema a resolver

El modelo manual actual presenta estos riesgos:

- Revisión lenta de archivos por plantel.
- Información descentralizada y duplicada.
- Acceso no segmentado a documentos sensibles.
- Falta de monitoreo de avance en tiempo real.
- Reportes manuales propensos a errores.
- Responsabilidades poco claras entre planteles, responsables y administración.

## Objetivo general

Desarrollar una plataforma web para gestionar de forma centralizada, segura y eficiente los indicadores POA, permitiendo captura, seguimiento, validación y análisis por plantel, actividad, periodo, indicador y año operativo.

## Principios del producto

- Control de acceso por rol desde el primer módulo.
- Catálogos normalizados antes de construir reportes.
- Evidencias fuera del repositorio Git y con metadatos consultables.
- Formularios configurables para evitar crear una pantalla distinta por cada Excel.
- Trazabilidad de cada cambio relevante.
- Reportes útiles para responsables y administradores, no solo exportaciones estáticas.

## Éxito del MVP

El MVP se considera útil cuando:

- Un administrador puede registrar planteles, usuarios, indicadores, actividades y periodos.
- Un administrador puede seleccionar o configurar el ciclo anual de trabajo.
- Un plantel puede capturar avance y adjuntar evidencia.
- Un responsable puede revisar avances, aceptar o solicitar corrección.
- Un administrador puede consultar el avance general y filtrar por periodo, plantel, actividad e indicador.
- El sistema impide que un usuario vea o modifique información fuera de su alcance.
