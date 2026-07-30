# Auditoría de dependencias

La entrega ejecuta `npm run audit:check` en CI. Los hallazgos `high` y
`critical` bloquean la integración salvo una excepción explícita, acotada y
verificada automáticamente.

## Excepción vigente

- Aviso: `GHSA-qwww-vcr4-c8h2`.
- Paquetes afectados: `react-router` y `react-router-dom`.
- Revisión obligatoria antes del 31 de octubre de 2026.
- Motivo de no aplicabilidad actual: la vulnerabilidad afecta acciones en modo
  React Server Components. ADPeak es una SPA declarativa servida por Vite; no
  instala paquetes de React Router Framework, no usa RSC ni Server Actions.

El script rechaza la excepción si se incorpora cualquier paquete o importación
de servidor/RSC, si aparece otro aviso de severidad alta o crítica, o si vence
la fecha de revisión. La excepción debe eliminarse tan pronto exista una
versión corregida compatible.
