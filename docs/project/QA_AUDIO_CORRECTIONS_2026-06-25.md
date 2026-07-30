# Correcciones QA por audios - 2026-06-25

## Fuente

- WhatsApp Ptt 2026-06-25 4.19.20 PM.ogg
- WhatsApp Ptt 2026-06-25 4.20.40 PM.ogg
- WhatsApp Ptt 2026-06-25 4.21.02 PM.ogg
- WhatsApp Ptt 2026-06-25 4.24.23 PM.ogg

## Hallazgos atendidos

| Hallazgo | Correccion aplicada | Estado |
| --- | --- | --- |
| Responsable necesitaba distinguir indicadores propios de capturas por revisar. | Se agrego `Mis indicadores` y `En revision` como vistas separadas para Responsable. | Corregido |
| Responsable podia ver mezcla de indicadores de revision, pero no sus indicadores asignados. | `/indicadores` queda disponible para Responsable con sus indicadores asignados. | Corregido |
| El mismo indicador compartido entre bachilleratos podia abrir una captura equivocada. | La vista `En revision` separa filas por `captureId`/plantel y conserva el `plantelId` de la captura. | Corregido |
| Reportes de Responsable parecian avance institucional por bachillerato. | Reportes de Responsable ya no generan filas base por plantel; solo muestran datos capturados reales de sus indicadores. | Corregido |
| Responsable necesitaba reporte con informacion almacenada del indicador, no solo avance. | CSV/PDF se generan desde `reporte.indicadores[].datos[]` y la tabla de Responsable muestra registros capturados. | Corregido |
| Responsable no podia guardar ediciones en capturas en revision en el endpoint serverless. | `PUT /capturas/:id` usa `responsibleEdit` y permite actualizar solo capturas `en_revision` asignadas. | Corregido |

## Validacion esperada

- Responsable entra a `Mis indicadores` y ve indicadores asignados.
- Responsable entra a `En revision` y ve solo capturas enviadas por planteles.
- Si Bach. 1 y Bach. 16 envian el mismo indicador, se muestran como capturas separadas.
- La descarga de Responsable incluye informacion capturada por indicador, no tablero global de bachilleratos.
