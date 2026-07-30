# Manejo de Datos Confidenciales

## Regla principal

Este repositorio público no debe contener documentos fuente, evidencias reales,
datos personales de estudiantes o beneficiarios, hojas Excel institucionales,
ZIPs, PDFs de constancias, resultados de admisión ni archivos exportados desde
carpetas de trabajo.

El catálogo backend sí conserva nombres laborales de responsables
institucionales y rutas nominales de procedencia para mantener trazabilidad con
la fuente oficial. Su publicación requiere autorización institucional; no debe
ampliarse con correos, teléfonos, identificadores, firmas ni información privada.

## Separación de repositorios

### Repositorio público

Uso permitido:

- Código fuente.
- Documentación técnica no sensible.
- Plan de acción público.
- Modelos conceptuales sin datos personales.
- Ejemplos ficticios.
- Nombres laborales mínimos de responsables autorizados cuando sean necesarios
  para la trazabilidad oficial.

Uso prohibido:

- Evidencias reales.
- Listas de estudiantes.
- Números de cuenta.
- Resultados de evaluaciones o admisión.
- Constancias, certificados o memorias individuales.
- Hojas de cálculo originales.
- Credenciales o configuraciones reales.
- Correos, teléfonos, CURP, RFC, firmas u otros identificadores personales de
  responsables.

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

- El contenido PDF se guarda en `app_evidence`, separado de `app_state`.
- La referencia incluye SHA-256 y se verifica al escribir y al leer.
- El backend valida firma PDF, marcador final, tamaño y tipo permitido.
- Abrir o descargar requiere sesión y alcance sobre la captura.
- El historial registra apertura, reemplazo y descarga sin guardar base64.
- El reset oficial y el harness QA limpian/restauran estado y evidencia juntos.
- La política institucional de retención debe definirse antes de almacenar
  evidencias reales de largo plazo.

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
