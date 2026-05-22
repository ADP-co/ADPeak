# Guía de Ramas del Proyecto

## Estructura de Ramas (Git Flow)

### 🔴 Rama Main (Producción)
- **main**: Versión en producción. Solo se actualiza desde `release` o `hotfix`
- Uso: Código estable y testeado en producción
- Política: No editar directamente, solo PRs desde release/hotfix

### 🟠 Rama Develop (Integración)
- **develop**: Rama de desarrollo e integración
- Uso: Base para todas las feature branches
- Política: Código testeado pero en desarrollo

---

## 📋 Ramas de Características (Features)

Cada rama feature se crea desde `develop` y se fusiona nuevamente en `develop` al completarse.

### `feature/auth-users`
- **Descripción**: Sistema de autenticación, login, y gestión de usuarios
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Login/Logout de directivos y administradores
  - Gestión de roles (Directivo, Administrador, DGEMS)
  - Control de permisos
  - Recuperación de contraseña

### `feature/api-backend`
- **Descripción**: API REST backend principal
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Endpoints para autenticación
  - Endpoints para reportes
  - Endpoints para usuarios
  - Validaciones de datos

### `feature/frontend-ui`
- **Descripción**: Interfaz de usuario (HTML, CSS, JavaScript/React/Vue)
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Diseño responsivo
  - Componentes reutilizables
  - Sistema de temas
  - Accesibilidad

### `feature/upload-reports`
- **Descripción**: Módulo para carga de reportes de labores
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Interfaz de carga de archivos
  - Validación de formatos
  - Generación de referencias
  - Confirmación de carga

### `feature/reports-dashboard`
- **Descripción**: Dashboard de visualización y seguimiento de reportes
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Listado de reportes
  - Filtros y búsqueda
  - Estado de reportes
  - Descarga de reportes

### `feature/email-notifications`
- **Descripción**: Sistema de notificaciones por correo electrónico
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Notificaciones de carga de reportes
  - Recordatorios a directivos
  - Avisos a DGEMS
  - Plantillas de correo

### `feature/file-storage`
- **Descripción**: Gestión y almacenamiento de archivos
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Almacenamiento en servidor
  - Copias de seguridad
  - Eliminación segura de archivos
  - Historial de versiones

### `feature/reporting-analytics`
- **Descripción**: Reportes y análisis de datos
- **Responsables**: [Asignar]
- **Funcionalidades**:
  - Reportes consolidados por institución
  - Estadísticas de cumplimiento
  - Gráficos y visualizaciones
  - Exportación de datos

---

## 🔄 Flujo de Trabajo

### Crear una Nueva Feature
```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear feature branch
git checkout -b feature/nombre-descriptivo

# 3. Hacer cambios y commits
git add .
git commit -m "Descripción clara del cambio"

# 4. Push a la rama
git push origin feature/nombre-descriptivo
```

### Completar una Feature
```bash
# 1. Asegurar código actualizado
git fetch origin
git rebase origin/develop

# 2. Hacer último push
git push origin feature/nombre-descriptivo

# 3. Crear Pull Request en GitHub/GitLab
# - Asignar revisores
# - Describir cambios
# - Referenciar issues

# 4. Después de aprobación, mergear a develop
git checkout develop
git merge feature/nombre-descriptivo
git push origin develop

# 5. Eliminar rama local
git branch -d feature/nombre-descriptivo
```

---

## 📦 Ramas de Release (cuando aplique)

Cuando esté lista una versión:
```bash
git checkout -b release/v1.0.0
# - Bump version
# - Último testing
# - Merge a main y develop
```

---

## 🚨 Ramas de Hotfix (emergencias)

Si hay bug crítico en producción:
```bash
git checkout -b hotfix/descripcion main
# - Arreglar bug
# - Merge a main y develop
```

---

## ✅ Mejores Prácticas

1. **Nombres de rama**: Usar `feature/`, `bugfix/`, `hotfix/`, `release/`
2. **Commits**: Mensajes claros y descriptivos en español o inglés
3. **Pull Requests**: Siempre usar PRs, no hacer push directo a develop/main
4. **Code Review**: Mínimo 1 aprobación antes de mergear
5. **Tests**: Ejecutar tests antes de push
6. **Push Regular**: No mantener commits sin subir

---

## 👥 Asignación de Equipos

Por favor editar esta sección con los nombres de los integrantes:

| Feature | Responsable | Estado |
|---------|-------------|--------|
| auth-users | | 🟡 Por Asignar |
| api-backend | | 🟡 Por Asignar |
| frontend-ui | | 🟡 Por Asignar |
| upload-reports | | 🟡 Por Asignar |
| reports-dashboard | | 🟡 Por Asignar |
| email-notifications | | 🟡 Por Asignar |
| file-storage | | 🟡 Por Asignar |
| reporting-analytics | | 🟡 Por Asignar |

---

**Última actualización**: 2026-03-03
