# Credenciales de entrega

Estas credenciales son para la entrega academica y pruebas funcionales. No son
credenciales productivas.

## Director

| Usuario | Contraseña | Alcance |
| --- | --- | --- |
| `director` | `Director2026!` | Analisis, usuarios, indicadores y reportes institucionales. |

## Planteles

| Usuario | Contraseña | Alcance |
| --- | --- | --- |
| `bach16` | `Plantel2026!` | Captura del Bachillerato 16. |
| `bach4` | `Plantel2026!` | Captura del Bachillerato 4. |
| `bach1` | `Plantel2026!` | Captura del Bachillerato 1. |
| `bach33` | `Plantel2026!` | Captura del Bachillerato 33. |

## Responsables

Todos los responsables usan la contraseña `Resp2026!`.

| Usuario | Responsable |
| --- | --- |
| `resp01` | Adriana Ruiz Rivera |
| `resp02` | Angel Ordoñez Ayala |
| `resp03` | Ariadna Zuñiga Torres |
| `resp04` | Armando Hernández Ramírez |
| `resp05` | Arturo Gordillo Chávez |
| `resp06` | Carlos Hernández Nava |
| `resp07` | Claudia Raquel Piña Andrade |
| `resp08` | Daniela Nohemi Navarro Castillo |
| `resp09` | Dulce Sarahi García Mójica |
| `resp10` | Laura Gabriela Calvario |
| `resp11` | Liliana Yunuen Rojas Maciel |
| `resp12` | Ma. Guadalupe del Rocío Herrera Chacón |
| `resp13` | Marcial Aviña Iglesias |
| `resp14` | Martín Jesús Robles DeAnda |
| `resp15` | Oscar Delgado Sánchez |
| `resp16` | Oscar Gustavo Mendoza Barajas |
| `resp17` | Oscar Pedraza Farías |
| `resp18` | Salvador Aguilar Aguilar |

## Notas tecnicas

- El login valida contra `POST /api/v1/auth/login` cuando hay backend
  configurado.
- El backend guarda usuarios, indicadores y capturas en `SIGI_DATA_FILE`.
- El frontend conserva fallback local solo para presentacion sin servidor.
