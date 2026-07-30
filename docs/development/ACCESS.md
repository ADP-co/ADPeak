# Acceso y cuentas

Las contraseñas no se versionan. Las credenciales iniciales de entrega se
distribuyen en un documento privado y deben configurarse mediante variables de
ambiente:

- `INITIAL_DIRECTOR_PASSWORD`
- `INITIAL_RESPONSABLE_PASSWORD`
- `INITIAL_PLANTEL_PASSWORD`

Esas claves existen únicamente para el primer acceso. Toda cuenta restaurada al
baseline oficial queda marcada con `passwordChangeRequired` y debe establecer
una contraseña individual antes de usar las demás rutas. Tanto la contraseña
inicial como la nueva deben tener al menos ocho caracteres.

## Inventario oficial

- Un Director: `director`.
- Dieciocho responsables: `resp01` a `resp18`.
- Treinta y siete planteles: `bach1` a `bach35`, `bachlinea` e `iuba`.

El baseline de entrega contiene 56 cuentas. Las cuentas adicionales requieren
una justificación institucional y no forman parte del estado de fábrica.

## Controles de acceso

- El login se valida exclusivamente en `POST /api/v1/auth/login`.
- La sesión productiva usa una cookie firmada `HttpOnly`, `Secure` y
  `SameSite=Strict`; el token no se devuelve en el JSON de producción.
- Los intentos fallidos se limitan por una clave anonimizada y durable.
- Cambiar usuario, rol o plantel en `localStorage` no modifica los permisos del
  backend.
- Solo existe una cuenta de Director.
- Los planteles provienen del catálogo institucional.
- La creación manual desde la interfaz agrega responsables.
- El Director puede restablecer una contraseña, que vuelve a ser temporal.
- Contraseñas, hashes y tokens nunca se muestran en listados, historial,
  reportes ni logs funcionales.

## Recuperación

El restablecimiento se realiza desde `Usuarios > Contraseña`. La interfaz debe
pedir nueva contraseña y confirmación, y el backend debe registrar el evento sin
guardar el secreto. Una cuenta bloqueada recibe un mensaje específico y no se
confunde con credenciales incorrectas.
