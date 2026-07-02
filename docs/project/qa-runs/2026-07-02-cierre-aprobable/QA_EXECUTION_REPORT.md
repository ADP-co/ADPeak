# QA Cierre Aprobable ADPeak / SIGI-POA

Fecha: 2026-07-02
Ambiente local: `NODE_ENV=test` con estado temporal en archivo.
Fuente oficial: `indicadores-20260628T002121Z-3-001.zip`.

## Resultado Ejecutivo

Veredicto local: aprobable para despliegue.

Los cambios críticos del cierre fueron verificados por pruebas automatizadas y por pruebas API locales sin tocar datos productivos.

## Cambios Verificados

| Hallazgo | Corrección | Verificación |
| --- | --- | --- |
| Estado persistido viejo con indicadores o usuarios manuales | Se incrementó `officialCatalogImportVersion` para rehidratar desde catálogo oficial en producción | Build y pruebas pasan; catálogo local oficial muestra 14 indicadores visibles y 0 `FMT-*` |
| Nuevos responsables sin contraseña | Backend exige contraseña inicial mínima para usuarios nuevos; frontend muestra campo de contraseña inicial | API: crear responsable sin contraseña devuelve `400` |
| Falta restablecimiento de contraseña desde administración | Se agregó `PATCH /api/v1/usuarios/:id/password` y modal en Usuarios | API: reset de contraseña permite iniciar sesión con la nueva clave |
| Valores negativos aceptados en capturas | Backend valida columnas numéricas y calculadas en borrador y envío | Test backend: rechazo de número negativo |
| Totales oficiales manuales en `1.0.0.0.2` | Importador convierte totales y porcentaje de titulación en cálculos automáticos | Test backend: columnas oficiales calculadas y rechazo de total incoherente |
| Filtros inválidos devolvían datos globales | Reportes mantienen validación de plantel y estado | API: `estado=NO_EXISTE` devuelve 0 filas; `plantelId=999` devuelve `400` |
| Evidencia y justificación faltantes al enviar | Backend exige justificación mínima y evidencia PDF | Test backend: envío sin evidencia falla |

## Comandos Ejecutados

```text
npm.cmd run typecheck
npm.cmd test -- --runInBand
npm.cmd run build
npm.cmd run repo:verify
git diff --check
```

## Resultados Automatizados

| Comando | Resultado |
| --- | --- |
| `npm.cmd run typecheck` | Aprobado |
| `npm.cmd test -- --runInBand` | Aprobado: frontend 10/10, backend 69/69 |
| `npm.cmd run build` | Aprobado |
| `npm.cmd run repo:verify` | Aprobado |
| `git diff --check` | Aprobado |

## Prueba API Local Sanitizada

| Caso | Resultado |
| --- | --- |
| `/health` | `ok` |
| Login `director` | Aprobado |
| Indicadores visibles | 14 |
| Indicadores `FMT-*` visibles | 0 |
| Crear responsable sin contraseña | `400` |
| Crear responsable con contraseña válida | Aprobado |
| Reset de contraseña de responsable | Aprobado |
| Login con nueva contraseña | Aprobado |
| `GET /reportes?estado=NO_EXISTE` | 0 indicadores, 0 filas |
| `GET /reportes?plantelId=999` | `400` |

## Pendientes Operativos

Producción se limpiará al desplegar el nuevo build porque el backend compara `catalogImportVersion`. No se respaldó `app_state` desde este entorno porque no se leyó ni exportó la URL real de base de datos para evitar exponer secretos. La estrategia segura aplicada es rehidratación controlada por versión de catálogo.
