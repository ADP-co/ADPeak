# Manejo de Datos Confidenciales

## Regla principal

Este repositorio público no debe contener documentos fuente, evidencias reales, datos personales, hojas Excel institucionales, ZIPs, PDFs de constancias, resultados de admisión ni archivos exportados desde carpetas de trabajo.

El código puede ser público; la información operativa y documental debe permanecer privada.

## Separación de repositorios

### Repositorio público

Uso permitido:

- Código fuente.
- Documentación técnica no sensible.
- Plan de acción público.
- Modelos conceptuales sin datos personales.
- Ejemplos ficticios.

Uso prohibido:

- Evidencias reales.
- Listas de estudiantes.
- Números de cuenta.
- Resultados de evaluaciones o admisión.
- Constancias, certificados o memorias individuales.
- Hojas de cálculo originales.
- Credenciales o configuraciones reales.

`.env.example` puede contener unicamente placeholders locales no secretos. Los
archivos `.env` reales y cualquier configuracion con credenciales deben quedar
fuera de Git.

### Repositorio privado

Uso permitido:

- ZIPs originales.
- Inventario documental.
- Revisión de requisitos extraída de fuentes internas.
- Referencias a documentos con datos personales.
- Materiales de trabajo que solo debe ver el equipo autorizado.

## Desarrollo con datos de prueba

Para programar y probar:

- Usar datos ficticios.
- No copiar nombres reales de estudiantes.
- No copiar números de cuenta.
- No usar PDFs o imágenes reales como fixtures.
- Crear archivos de prueba mínimos y claramente falsos.

## Evidencias en el sistema

Cuando se implemente el módulo de archivos:

- Guardar archivos fuera del repositorio Git.
- Registrar solo metadatos necesarios en base de datos.
- Validar tamaño y extensión.
- Aplicar permisos de descarga.
- Registrar quién sube, reemplaza o descarga evidencia.
- Definir política de retención y eliminación.

## Pull Requests

Antes de abrir un Pull Request:

```bash
git status
git diff --name-only
```

Verificar que no aparezcan:

- `.zip`
- `.xlsx`
- `.xls`
- `.csv`
- `.pdf`
- `.docx`
- `.pptx`
- `.env`
- `.env.*`
- carpetas `data/`, `private/`, `confidential/`, `evidence/`, `uploads/` o `source-materials/`

Si alguno aparece, detener el PR y mover el archivo al repositorio privado o al almacenamiento autorizado.

## Incidente de exposición

Si un archivo confidencial llega a un commit:

1. Detener pushes y Pull Requests.
2. Avisar al responsable del repositorio.
3. Remover el archivo del historial antes de publicar.
4. Rotar credenciales si el archivo contenía secretos.
5. Revisar accesos si contenía datos personales.
