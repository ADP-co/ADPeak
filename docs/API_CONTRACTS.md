# Contratos de API para frontend y QA

Base URL local: `http://localhost:3000/api/v1`

## Autorizacion temporal por headers

Mientras la autenticacion real se integra en otra rama, los endpoints protegidos reciben el actor por headers para permitir pruebas de permisos y alcance.

| Header | Requerido | Descripcion |
| --- | --- | --- |
| `x-role` | si | `admin`, `plantel` o `responsable` |
| `x-user-id` | si | ID entero positivo del usuario actor |
| `x-plantel-id` | solo rol `plantel` | Plantel permitido para captura/consulta |
| `x-responsable-id` | opcional rol `responsable` | Responsable efectivo; si falta usa `x-user-id` |

Errores comunes:

| Estado | Causa |
| --- | --- |
| `400` | Payload invalido, IDs no enteros o campos extra no permitidos |
| `401` | Header de actor faltante o invalido |
| `403` | Rol o alcance sin permiso, captura no editable o cerrada |
| `404` | Recurso no encontrado |

## Capturas

### Crear borrador

`POST /capturas/borradores`

Roles: `admin`, `plantel`. El rol `plantel` solo puede crear con su propio `plantelId`.

Request:

```json
{
  "plantelId": 1,
  "indicadorId": 1,
  "actividadId": 1,
  "periodoId": 1,
  "responsableId": 2,
  "payload": {
    "avance": 35,
    "observaciones": "Avance inicial"
  },
  "motivoCambio": "borrador inicial"
}
```

Response `201`:

```json
{
  "id": 1,
  "plantelId": 1,
  "indicadorId": 1,
  "actividadId": 1,
  "periodoId": 1,
  "responsableId": 2,
  "estado": "borrador",
  "versionActual": 1,
  "payload": {
    "avance": 35,
    "observaciones": "Avance inicial"
  },
  "cerradoEn": null,
  "creadoEn": "2026-06-02 10:00:00",
  "actualizadoEn": "2026-06-02 10:00:00"
}
```

`actividadId` es requerido; la captura no acepta actividad nula porque forma parte de la llave logica de unicidad por plantel, indicador, actividad y periodo.

### Actualizar borrador o autoguardado

`PUT /capturas/{id}`

Roles: `admin`, `plantel`. No permite modificar capturas `en_revision`, `aprobado` o `cerrado`.

Request:

```json
{
  "payload": {
    "avance": 65,
    "observaciones": "Autoguardado con evidencia validada"
  },
  "motivoCambio": "autoguardado"
}
```

Response `200`: devuelve la captura con `versionActual` incrementada y una nueva entrada en historial.

### Enviar a revision

`POST /capturas/{id}/enviar-revision`

Roles: `admin`, `plantel`. Cambia el estado a `en_revision`, registra auditoria y bloquea edicion directa.

### Consultar estado

`GET /capturas/{id}/estado`

Response `200`:

```json
{
  "id": 1,
  "estado": "en_revision",
  "versionActual": 2,
  "cerrado": false,
  "actualizadoEn": "2026-06-02 10:05:00"
}
```

### Recuperar captura

`GET /capturas/{id}`

Roles: `admin`, plantel propietario o responsable asignado.

### Recuperar historial

`GET /capturas/{id}/historial`

Response `200`:

```json
{
  "capturaId": 1,
  "versionActual": 2,
  "versiones": [
    {
      "id": 1,
      "numero": 1,
      "payload": { "avance": 35 },
      "motivoCambio": "borrador inicial",
      "creadoPorUsuarioId": 3,
      "creadoEn": "2026-06-02 10:00:00"
    }
  ]
}
```

## Revisiones

### Listar capturas revisables

`GET /revisiones`

Roles: `admin`, `responsable`, `plantel`.

Alcance:

- `admin`: todas las capturas revisables.
- `responsable`: capturas donde es responsable directo o asignado al indicador/plantel.
- `plantel`: solo sus capturas.

### Resolver revision

`POST /revisiones/{capturaId}/resolver`

Roles: `admin`, `responsable`.

Request:

```json
{
  "estado": "correccion_solicitada",
  "comentario": "Falta evidencia de soporte"
}
```

`estado` admite `correccion_solicitada`, `aprobado` o `cerrado`.

Reglas de transicion: `correccion_solicitada` y `aprobado` solo salen de `en_revision`. `cerrado` solo sale de `aprobado` y requiere rol `admin`. Una captura `cerrado` no puede modificarse ni resolverse de nuevo.

Estas reglas evitan aprobaciones directas de borradores y cierres prematuros antes de la validacion del responsable.

## Dashboard

Contrato minimo para frontend mientras se completa el modulo visual:

`GET /revisiones` entrega las capturas por estado y alcance, suficientes para construir contadores por `estado`, pendientes por responsable y alertas de cierre. Si el dashboard necesita agregados, debe derivarlos de esa respuesta hasta que exista un endpoint especifico de metricas.

## Reportes

El contrato base de reportes ya debe consumir JSON filtrable. Para interoperar con la rama de reportes, el backend debe mantener filtros con nombres estables:

| Filtro | Tipo |
| --- | --- |
| `cicloId` | entero |
| `periodoId` | entero |
| `plantelId` | entero |
| `actividadId` | entero |
| `indicadorId` | entero |
| `responsableId` | entero |
| `estado` | `borrador`, `enviado`, `en_revision`, `correccion_solicitada`, `aprobado`, `cerrado` |

La salida esperada es JSON, no PDF directo, para que el modulo de exportacion pueda transformar el resultado.
