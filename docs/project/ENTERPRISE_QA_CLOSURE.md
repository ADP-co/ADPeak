# Cierre empresarial de calidad SIGI-POA

Fecha: 2026-06-30

## Objetivo

Este documento convierte el plan de cierre de 24 horas en un protocolo
reproducible para validar ADPeak/SIGI-POA antes de entrega, mantenimiento o
despliegue publico.

## Reglas no negociables

- Toda informacion visible de indicadores debe venir del catalogo oficial, del
  backend o de una plantilla validada.
- El frontend no debe inventar indicadores, columnas, responsables, planteles ni
  estados de flujo.
- Si la API no esta disponible, las escrituras deben fallar con mensaje claro;
  no se deben guardar cambios ficticios en `localStorage`.
- Cada rol debe operar solo dentro de su alcance.
- PDF, CSV y vista web deben consumir la misma estructura de reporte.

## Celulas de trabajo

| Celula | Responsabilidad | Evidencia minima |
|---|---|---|
| Datos oficiales | Importacion, mapeo, columnas, planteles, responsables y formulas | Matriz por indicador y pruebas de plantillas |
| Backend/dominio | API, permisos, capturas, estados, notificaciones y auditoria | Pruebas unitarias y negativas por rol |
| Frontend/UX | Pantallas por rol, botones, mensajes y navegacion | Recorrido visual y consola limpia |
| Reportes | PDF, CSV, Excel, filtros y detalle capturado | Archivos descargados revisados |
| QA automatizado | Typecheck, tests, build y reglas de regresion | `npm run repo:verify` |
| QA manual | Navegador y Computadora, clic por clic | Checklist firmado por rol |

## Checklist automatico

Ejecutar antes de cualquier entrega:

```bash
npm run typecheck
npm test
npm run build
npm run repo:verify
git diff --check
```

Validaciones cubiertas por pruebas:

- No hay indicadores visibles con `FMT-*` o `*-FMT-*`.
- Cada indicador visible tiene plantilla con columnas y filas.
- No hay encabezados genericos `Columna N` en plantillas visibles.
- Las columnas de plantel no quedan vacias ni como `Bachillerato` sin numero.
- Las escrituras de catalogo no se guardan localmente cuando la API no existe.
- El usuario bloqueado se distingue de credenciales incorrectas.

## Checklist manual clic por clic

### Director

- Iniciar sesion.
- Abrir analisis.
- Abrir indicadores.
- Modificar un indicador permitido.
- Abrir usuarios.
- Bloquear y desbloquear un responsable.
- Abrir reportes.
- Filtrar por ciclo, periodo, estado, plantel, responsable e indicador.
- Descargar PDF y CSV.
- Confirmar que el reporte muestra datos capturados, no solo porcentajes.

### Responsable

- Iniciar sesion.
- Abrir Mis indicadores.
- Abrir un indicador asignado.
- Guardar cambios permitidos.
- Agregar fila cuando la plantilla lo permita.
- Abrir En revision.
- Observar una captura.
- Aprobar una captura.
- Abrir historial.
- Confirmar que no ve indicadores ajenos.

### Plantel

- Iniciar sesion.
- Abrir indicadores asignados.
- Abrir captura.
- Guardar borrador.
- Adjuntar evidencia permitida.
- Enviar a revision.
- Recargar pagina y confirmar persistencia.
- Corregir una captura observada.
- Descargar reporte propio.
- Confirmar que no puede operar otro plantel.

## Criterios de severidad

| Severidad | Criterio | Accion |
|---|---|---|
| P0 | Datos falsos, permisos rotos, guardado bloqueado, reporte incorrecto | Bloquea entrega |
| P1 | Indicador incompleto, estado desincronizado, descarga rota | Corregir antes de deploy |
| P2 | Texto, margen, responsive, accesibilidad basica | Corregir o documentar |
| P3 | Deuda tecnica no visible para entrega | Registrar para mantenimiento |

## Criterio de cierre

La version queda lista solo si:

- No existen P0 ni P1 abiertos.
- Todas las pruebas automaticas pasan.
- La app publica responde en `https://adpeak-sigi-poa.vercel.app/login`.
- El flujo minimo por rol funciona en produccion.
- Los archivos PDF/CSV descargados abren correctamente.
- La matriz de indicadores queda actualizada.
