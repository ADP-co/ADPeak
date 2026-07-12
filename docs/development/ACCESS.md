# Acceso y cuentas

Las contraseñas no se versionan. Producción usa credenciales individuales y el
archivo privado de entrega se genera fuera del repositorio durante la rotación.
Los ambientes locales o QA deben definir:

- `INITIAL_DIRECTOR_PASSWORD`
- `INITIAL_RESPONSABLE_PASSWORD`
- `INITIAL_PLANTEL_PASSWORD`

Los tres valores deben tener al menos 12 caracteres. En producción no se
aceptan valores que contengan `change`, `placeholder`, `test` o `demo`.

## Inventario oficial

- Un Director: `director`.
- Ocho responsables: `resp01` a `resp08`.
- Treinta y siete planteles: `bach1` a `bach35`, `bachlinea` e `iuba`.

Las cuentas adicionales requieren una justificación institucional y no forman
parte del baseline certificado.

## Reglas operativas

- El login se valida exclusivamente en `POST /api/v1/auth/login`.
- Solo existe una cuenta de Director.
- Los planteles provienen del catálogo institucional.
- La creación manual desde la interfaz agrega responsables.
- El Director puede restablecer una contraseña; la nueva contraseña nunca se
  devuelve en listados, historial, reportes ni logs.
- Cambiar datos en `localStorage` no modifica el rol ni el alcance autorizados
  por el backend.
