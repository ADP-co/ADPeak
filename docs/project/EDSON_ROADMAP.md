# Roadmap de Edson

Responsable: Edson  
Frentes asignados en el action plan original: herramientas de desarrollo y deployment.  
Meta principal: que el equipo pueda desarrollar, integrar, probar y presentar una demo funcional de SIGI-POA DGEMS sin bloqueos técnicos.

## Rol dentro del proyecto

Edson no solo cubre tareas técnicas aisladas. Su responsabilidad es habilitar el trabajo del resto del equipo:

- Definir el flujo de desarrollo.
- Preparar el repositorio para trabajo colaborativo.
- Estandarizar herramientas.
- Mantener ambiente local reproducible.
- Preparar despliegue de demo.
- Reducir riesgos antes de la reunión/demo con DGEMS.

## Alcance asignado

### Herramientas de desarrollo

Objetivo: que todos los integrantes puedan trabajar con las mismas reglas, comandos y estructura.

Entregables:

- Estructura base del proyecto.
- README técnico para levantar el sistema.
- Variables de entorno de ejemplo.
- Plantillas de Pull Request e issues.
- Reglas de ramas y commits.
- Linting/formato si aplica.
- Scripts de desarrollo.
- Datos ficticios mínimos para demo.

### Deployment

Objetivo: tener un ambiente de demo confiable antes del 31 de mayo de 2026.

Entregables:

- Configuración de ambiente de demo.
- Documentación de despliegue.
- Variables de entorno para demo.
- Estrategia de base de datos demo.
- Estrategia de almacenamiento de evidencias demo.
- Checklist de pre-demo.
- Plan de respaldo si el deployment falla.

## Roadmap por fechas

### 8-10 mayo: Alineación técnica inicial

Prioridad: alta.

Acciones:

- Confirmar stack final o stack provisional para la demo.
- Definir estructura de carpetas del proyecto.
- Confirmar si habrá frontend/backend separados o monorepo.
- Revisar que el PR de documentación quede aprobado o listo para merge.
- Crear issues Jira de los frentes técnicos.
- Definir convenciones de ramas:
  - `feature/auth-rbac`
  - `feature/indicator-catalog`
  - `feature/capture-forms`
  - `feature/evidence-storage`
  - `feature/review-workflow`
  - `feature/dashboard-reports`
  - `feature/deployment`

Entregable:

- Documento corto de decisiones técnicas iniciales.
- Tablero Jira con tareas separadas por responsable.

### 11-14 mayo: Base del repositorio y ambiente local

Prioridad: alta.

Acciones:

- Crear estructura inicial del proyecto.
- Agregar `.env.example`.
- Documentar comandos de instalación y ejecución.
- Configurar dependencias base.
- Agregar scripts mínimos:
  - instalar dependencias
  - iniciar frontend
  - iniciar backend
  - ejecutar validaciones
- Definir datos ficticios para:
  - usuario administrador
  - usuario responsable
  - usuario plantel
  - plantel demo
  - indicador demo
  - actividad demo

Entregable:

- Cualquier integrante puede clonar el repo y levantar el proyecto localmente.

### 15-18 mayo: Integración de módulos del equipo

Prioridad: alta.

Acciones:

- Revisar que autenticación, catálogos, captura, evidencias, revisión y dashboard usen nombres coherentes.
- Validar que las rutas principales no se contradigan.
- Coordinar contratos mínimos entre frontend/backend:
  - usuarios
  - roles
  - planteles
  - indicadores
  - actividades
  - capturas
  - evidencias
  - revisiones
- Definir errores comunes y mensajes de respuesta.
- Asegurar que nadie use datos reales en pruebas.

Entregable:

- Contrato mínimo de API o estructura compartida para la demo.

### 19-22 mayo: Ambiente de demo

Prioridad: crítica.

Acciones:

- Elegir dónde correrá la demo:
  - local controlado
  - servidor temporal
  - hosting/nube
- Preparar variables de entorno de demo.
- Configurar base de datos demo.
- Configurar almacenamiento de evidencias demo.
- Cargar datos ficticios.
- Probar flujo end-to-end:
  - admin inicia sesión
  - admin ve catálogo
  - plantel captura actividad
  - plantel sube evidencia
  - responsable revisa
  - admin ve avance

Entregable:

- URL o ambiente local estable para demo.
- Checklist de ejecución de demo.

### 23-26 mayo: Pruebas y estabilización

Prioridad: crítica.

Acciones:

- Probar permisos por rol.
- Probar carga y descarga de evidencias.
- Probar formularios con datos vacíos, inválidos y válidos.
- Revisar que el dashboard muestre estados correctos.
- Revisar que no existan archivos confidenciales en el repo.
- Revisar que el sistema pueda reiniciarse sin perder configuración demo.
- Documentar fallas conocidas si no alcanzan a corregirse.

Entregable:

- Lista de bugs críticos corregidos.
- Lista de riesgos conocidos para la demo.

### 27-29 mayo: Preparación de demo

Prioridad: crítica.

Acciones:

- Preparar guion de demo.
- Preparar datos demo finales.
- Congelar cambios no críticos.
- Hacer ensayo con el equipo.
- Verificar laptop, internet, acceso a GitHub/Jira y ambiente.
- Preparar plan B:
  - capturas de pantalla
  - video corto
  - ambiente local
  - respaldo de base de datos demo

Entregable:

- Demo ensayada y repetible.

### 30-31 mayo: Ejecución

Prioridad: crítica.

Acciones:

- Ejecutar checklist final.
- Confirmar que el ambiente esté activo.
- Tener sesión admin, responsable y plantel listas.
- Mostrar flujo completo sin depender de datos confidenciales.
- Registrar comentarios de DGEMS.
- Marcar nuevos requisitos como pendientes, no improvisar cambios en vivo.

Entregable:

- Demo funcional presentada.
- Lista de acuerdos, dudas y próximos pasos.

## Issues Jira sugeridos para Edson

### Herramientas de desarrollo

1. Configurar estructura base del repositorio.
2. Crear README técnico de instalación.
3. Crear `.env.example`.
4. Definir scripts de desarrollo.
5. Configurar flujo de ramas y PRs.
6. Crear datos ficticios para demo.
7. Documentar contrato mínimo entre módulos.

### Deployment

1. Definir ambiente de demo.
2. Configurar base de datos demo.
3. Configurar almacenamiento de evidencias demo.
4. Crear checklist de despliegue.
5. Probar flujo completo en ambiente demo.
6. Preparar plan B de presentación.
7. Documentar pasos de despliegue.

## Dependencias con otros compañeros

| Compañero/frente | Lo que Edson necesita | Lo que Edson entrega |
| --- | --- | --- |
| Frontend | Rutas, comandos y variables necesarias | Ambiente local y guía de ejecución |
| Backend | Puertos, variables, conexión DB y endpoints | Base de datos demo y scripts |
| Base de datos | Modelo inicial y migraciones | Ambiente para probar migraciones |
| Autenticación | Roles y usuarios semilla | Variables, datos demo y validación de permisos |
| Informes/dashboard | Datos esperados y filtros | Datos semilla y ambiente demo |
| Pruebas | Casos críticos a validar | Checklist y ambiente estable |
| Permisos | Reglas por rol | Validación técnica y flujo de demo |

## Criterios de éxito personal

Edson cumple su parte si:

- Todos pueden levantar el proyecto sin pedir instrucciones por chat.
- El repo tiene documentación mínima clara.
- La demo tiene un ambiente estable.
- Existen datos ficticios suficientes para mostrar el flujo.
- El equipo sabe qué comandos ejecutar.
- No se filtra información confidencial.
- Existe plan B si falla internet, hosting o base de datos.

## Riesgos a controlar

- El equipo integra tarde y no queda tiempo para demo.
- Cada módulo usa nombres distintos para las mismas entidades.
- Se suben datos reales o archivos confidenciales por accidente.
- El ambiente de demo depende de una sola laptop.
- La base de datos demo no tiene datos suficientes.
- No hay plan B si falla el deployment.

## Decisión recomendada

Para la demo del 31 de mayo, Edson debe priorizar estabilidad sobre completitud. Es mejor presentar un flujo corto pero sólido que muchos módulos incompletos.

Flujo mínimo recomendado:

1. Admin inicia sesión.
2. Admin ve catálogo básico.
3. Plantel captura una actividad.
4. Plantel adjunta evidencia ficticia.
5. Responsable revisa y aprueba.
6. Admin ve avance en dashboard.

