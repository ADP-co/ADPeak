# Guía de Ramas

Este proyecto usa una variante simple de Git Flow para mantener estable el código y permitir trabajo paralelo por módulo.

## Ramas principales

### `main`

Rama estable. Debe representar una versión lista para entrega, demo formal o despliegue.

Reglas:

- No hacer commits directos.
- Recibir cambios solo por Pull Request aprobado.
- Proteger con revisión obligatoria antes de merge.
- Mantener documentación y configuración coherentes con la versión publicada.

### `develop`

Rama de integración del equipo.

Reglas:

- Todas las ramas de trabajo nacen desde `develop`.
- Todo cambio funcional vuelve a `develop` por Pull Request.
- Debe compilar y pasar validaciones básicas antes de aceptar merges.

## Ramas de trabajo

Usar nombres claros y orientados al módulo:

- `feature/auth-rbac`
- `feature/indicator-catalog`
- `feature/capture-forms`
- `feature/evidence-storage`
- `feature/review-workflow`
- `feature/dashboard-reports`
- `feature/admin-panel`
- `feature/audit-security`
- `bugfix/descripcion-corta`
- `hotfix/descripcion-corta`
- `release/v0.1.0`

## Flujo para una feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-del-modulo
```

Durante el trabajo:

```bash
git status
git add .
git commit -m "Describe el cambio realizado"
git push -u origin feature/nombre-del-modulo
```

Al terminar:

1. Crear Pull Request hacia `develop`.
2. Explicar alcance, evidencias de prueba y riesgos.
3. Solicitar al menos una revisión.
4. Corregir comentarios antes del merge.
5. Eliminar la rama cuando quede integrada.

## Criterios mínimos para Pull Request

- La funcionalidad cumple el requerimiento documentado.
- No incluye archivos confidenciales, datos reales, ZIP, Excel, PDFs de evidencia ni credenciales.
- Incluye validaciones o pruebas cuando aplique.
- Actualiza documentación si cambia flujo, configuración, modelo de datos o permisos.
- Mantiene el alcance acotado a un módulo o cambio claro.

## Releases

Crear una rama `release/vX.Y.Z` cuando `develop` tenga un conjunto estable de funcionalidades.

Checklist:

- Versionar cambios relevantes.
- Probar autenticación, captura, carga de evidencia, revisión y reportes.
- Revisar migraciones y configuración de ambiente.
- Fusionar a `main` cuando quede aprobada.
- Fusionar de regreso a `develop` si hubo ajustes en release.

## Hotfixes

Usar `hotfix/*` solo para errores críticos detectados sobre una versión estable.

```bash
git checkout main
git pull origin main
git checkout -b hotfix/descripcion
```

Después del arreglo, hacer Pull Request a `main` y replicar el cambio en `develop`.

## Mapa inicial de módulos

| Módulo | Rama sugerida | Resultado esperado |
| --- | --- | --- |
| Autenticación y roles | `feature/auth-rbac` | Login, permisos por rol y sesiones seguras |
| Catálogo POA | `feature/indicator-catalog` | Indicadores, actividades, planteles, responsables y periodos |
| Captura de avances | `feature/capture-forms` | Formularios por indicador con validaciones |
| Evidencias | `feature/evidence-storage` | Carga, descarga autorizada y metadatos de archivos |
| Revisión | `feature/review-workflow` | Estados, observaciones, correcciones y aprobación |
| Dashboard y reportes | `feature/dashboard-reports` | Filtros, métricas, exportación y visualización |
| Administración | `feature/admin-panel` | Gestión de usuarios, catálogos y permisos |
| Auditoría y seguridad | `feature/audit-security` | Bitácora, trazabilidad y controles de datos |
