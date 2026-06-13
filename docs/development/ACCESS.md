# Credenciales de entrega

Estas credenciales son para la entrega academica y pruebas funcionales. No son
credenciales productivas.

## Administrador

| Usuario | Contrasena | Alcance |
| --- | --- | --- |
| `director` | `Director2026!` | Analisis, usuarios, indicadores y reportes institucionales. |

## Planteles

Todos los planteles usan la contrasena `Plantel2026!`.

| Usuario | Plantel |
| --- | --- |
| `bach1` | Bachillerato 1 |
| `bach2` | Bachillerato 2 |
| `bach3` | Bachillerato 3 |
| `bach4` | Bachillerato 4 |
| `bach5` | Bachillerato 5 |
| `bach6` | Bachillerato 6 |
| `bach7` | Bachillerato 7 |
| `bach8` | Bachillerato 8 |
| `bach9` | Bachillerato 9 |
| `bach10` | Bachillerato 10 |
| `bach11` | Bachillerato 11 |
| `bach12` | Bachillerato 12 |
| `bach13` | Bachillerato 13 |
| `bach14` | Bachillerato 14 |
| `bach15` | Bachillerato 15 |
| `bach16` | Bachillerato 16 |
| `bach17` | Bachillerato 17 |
| `bach18` | Bachillerato 18 |
| `bach19` | Bachillerato 19 |
| `bach20` | Bachillerato 20 |
| `bach21` | Bachillerato 21 |
| `bach22` | Bachillerato 22 |
| `bach23` | Bachillerato 23 |
| `bach24` | Bachillerato 24 |
| `bach25` | Bachillerato 25 |
| `bach26` | Bachillerato 26 |
| `bach27` | Bachillerato 27 |
| `bach28` | Bachillerato 28 |
| `bach29` | Bachillerato 29 |
| `bach30` | Bachillerato 30 |
| `bach31` | Bachillerato 31 |
| `bach32` | Bachillerato 32 |
| `bach33` | Bachillerato 33 |
| `bach34` | Bachillerato 34 |
| `bach35` | Bachillerato 35 |
| `bachlinea` | Bachillerato en linea |
| `iuba` | IUBA Bachillerato |

## Responsables

Todos los responsables usan la contrasena `Resp2026!`.

| Usuario | Responsable |
| --- | --- |
| `resp01` | Adriana Ruiz Rivera |
| `resp02` | Angel Ordonez Ayala |
| `resp03` | Ariadna Zuniga Torres |
| `resp04` | Armando Hernandez Ramirez |
| `resp05` | Arturo Gordillo Chavez |
| `resp06` | Carlos Hernandez Nava |
| `resp07` | Claudia Raquel Pina Andrade |
| `resp08` | Daniela Nohemi Navarro Castillo |
| `resp09` | Dulce Sarahi Garcia Mojica |
| `resp10` | Laura Gabriela Calvario |
| `resp11` | Liliana Yunuen Rojas Maciel |
| `resp12` | Ma. Guadalupe del Rocio Herrera Chacon |
| `resp13` | Marcial Avina Iglesias |
| `resp14` | Martin Jesus Robles DeAnda |
| `resp15` | Oscar Delgado Sanchez |
| `resp16` | Oscar Gustavo Mendoza Barajas |
| `resp17` | Oscar Pedraza Farias |
| `resp18` | Salvador Aguilar Aguilar |

## Notas tecnicas

- El login valida contra `POST /api/v1/auth/login` cuando hay backend configurado.
- El backend guarda usuarios, indicadores y capturas en `SIGI_DATA_FILE`.
- Solo existe una cuenta de administrador.
- Las cuentas de plantel se generan desde el catalogo oficial del sistema.
- La creacion manual de usuarios agrega cuentas de responsables.
