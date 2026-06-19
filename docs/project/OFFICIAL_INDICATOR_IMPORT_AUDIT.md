# Auditoria de importacion oficial de indicadores

Fecha de revision: 2026-06-19

## Fuente revisada

- `drive-download-20260428T232937Z-3-001.zip`: contiene `Libro1.xlsx`, `SIGI-POA DGEMS 2026.docx` y `Bachillerato 16-20260424T001029Z-3-001.zip`.
- `indicadores-20260428T232925Z-3-001.zip`: contiene 13 libros de formatos oficiales de indicadores.

El conector de Google Drive devolvio la carpeta `1oDfIBw4A9443XppW0_hl4PWqLnyEwSTs` sin archivos visibles para la cuenta conectada. La consulta de metadatos devolvio `404 File not found`, y el acceso HTTP publico abre una pantalla de inicio de sesion de Google Drive. Por eso la importacion reproducible usa los ZIP descargados localmente.

Verificacion local de fuentes:

- `drive-download-20260428T232937Z-3-001.zip`: 3 archivos, 1 hoja Excel (`Libro1.xlsx`).
- `Bachillerato 16-20260424T001029Z-3-001.zip`: 995 archivos, 39 libros Excel.
- `indicadores-20260428T232925Z-3-001.zip`: 13 libros Excel de formatos oficiales.

Tambien se reviso el historial Git completo (`git log --all --name-only -- *.xlsx *.xls *.csv`) y no hay hojas de calculo versionadas en ninguna rama remota/local. El archivo `SIGI-POA DGEMS 2026.docx` menciona los codigos de indicador, pero no contiene tablas ni campos de captura; por tanto no aporta formatos detallados para los codigos sin libro Excel.

## Resultado importado

- 99 filas fisicas desde `Libro1.xlsx`.
- 88 filas unicas de catalogo.
- 48 codigos de indicador en catalogo.
- 52 libros `.xlsx` analizados para formatos.
- 60 plantillas manipulables generadas desde hojas oficiales.
- 41 indicadores con alcance de plantel detectado desde evidencias.
- 97 indicadores totales disponibles en la app despues de extender los formatos que solo aparecen en libros Excel.

## Brecha detectada

Hay 37 codigos de `Libro1.xlsx` que no tienen un libro de formato detallado correspondiente dentro de los ZIP disponibles ni en el historial Git. En el sistema quedan como indicadores oficiales con responsable, contribuyente y actividad base, pero su tabla detallada usa la plantilla estructural del sistema hasta que el profesor/equipo proporcione el formato exacto.

| Codigo | Indicador | Responsable | Actividad base |
|---|---|---|---|
| `1.0.0.0.1` | Porcentaje de eficiencia terminal por cohorte de educacion media superior. | Liliana Yunuen Rojas Maciel | Indicadores educativos, Estudios de trayectoria |
| `1.0.0.0.2` | Porcentaje de titulacion por cohorte de educacion media superior | Adriana Ruiz Rivera | Titulacion |
| `1.1.0.0.1` | Porcentaje de cobertura en educacion media superior. | Liliana Yunuen Rojas Maciel | Indicadores educativos |
| `1.1.1.0.1` | Porcentaje de aceptacion en educacion media superior. | Liliana Yunuen Rojas Maciel | Indicadores educativos |
| `1.1.1.1.1` | Porcentaje de programas educativos de educacion media superior nuevos, actualizados y reestructurados | Oscar Delgado Sanchez | Diseno curricular |
| `1.1.2.1.1` | Porcentaje de estudiantes de educacion media superior atendidos en el Programa Institucional de Tutoria | Arturo Gordillo Chavez | Tutelaje y orientacion educativa y vocacional |
| `1.1.2.1.3` | Porcentaje de estudiantes de educacion media superior que sus padres, madres o tutores legales participan en acciones de orientacion familiar. | Arturo Gordillo Chavez | Tutelaje y orientacion educativa y vocacional |
| `1.1.2.2.1` | Porcentaje de estudiantes de educacion media superior atendidos en acciones de reforzamiento, asesoria o concursos de conocimiento. | Salvador Aguilar Aguilar | Concursos de conocimientos |
| `1.1.2.2.10` | Porcentaje de estudiantes de educacion media superior y superior que participan en acciones de sostenibilidad y medio ambiente. | Oscar Gustavo Mendoza Barajas | Acciones de sostenibilidad y medio ambiente |
| `1.1.2.2.5` | Numero de programas educativos de media superior y superior impartidos parcial o totalmente en una lengua extranjera. | Laura Gabriela Calvario | Programa de bachillerato bilingue |
| `1.1.2.2.8` | Porcentaje de estudiantes de educacion media superior y licenciatura certificados en el dominio de una lengua extranjera. | Laura Gabriela Calvario | Estudiantes certificados en lengua extranjera |
| `1.1.2.2.9` | Porcentaje de estudiantes de educacion media superior y superior que participan en acciones para promover la paz. | Arturo Gordillo Chavez | Comites de paz |
| `1.1.2.4.1` | Porcentaje de estudiantes de educacion media superior atendidos en acciones de inclusion educativa. | Ariadna Zuniga Torres | Trayectorias escolares |
| `1.1.2.5.10` | Porcentaje de docentes certificados en el dominio de una lengua extranjera. | Laura Gabriela Calvario | Docentes certificados en lengua extranjera |
| `1.1.2.5.3` | Porcentaje de PTC de educacion media superior beneficiados en el programa de ESDEPED. | Adriana Ruiz Rivera | Convocatoria de ESDEPED |
| `1.1.2.5.6` | Porcentaje de personal de apoyo academico que recibe capacitacion. | Oscar Delgado Sanchez | Formacion docente |
| `1.1.2.5.9` | Porcentaje de docentes participando en movilidad academica. | Laura Gabriela Calvario | Movilidad academica de docentes |
| `2.1.4.1.1` | Numero de acciones de fomento a vocaciones cientificas y tecnologicas. | Ariadna Zuniga Torres | Sensibilizacion y formacion en prevencion de la discriminacion |
| `2.1.4.1.3` | Porcentaje del estudiantado que participa en programas que fomentan vocaciones cientificas y tecnologicas. | Salvador Aguilar Aguilar | Semana de Vinculacion Academica para las Juventudes |
| `3.1.0.0.1` | Numero de programas y proyectos de extension y vinculacion dirigidas al sector social y productivo. | Oscar Delgado Sanchez | Diseno curricular |
| `3.1.1.3.6` | Numero de participantes en actividades de sostenibilidad y medio ambiente convocadas por el SIGA. | Oscar Gustavo Mendoza Barajas | Participantes en acciones sostenibles |
| `4.0.0.0.1` | Porcentaje de UO que impulsan el fortalecimiento de la gobernanza institucional. | Martin Jesus Robles DeAnda | Fortalecimiento a la gobernanza institucional |
| `4.1.0.0.1` | Porcentaje de actualizacion de procesos certificados ante normas ISO. | Laura Gabriela Calvario | Procesos certificados con estandares ISO |
| `4.1.1.0.1` | Numero de sistemas de informacion institucionales que interoperan. | Angel Ordonez Ayala | Sistemas de informacion institucionales interoperables |
| `4.1.1.1.1` | Numero de sistemas implementados y mejorados para fortalecer la gestion de procesos institucionales. | Angel Ordonez Ayala | Sistemas academicos o administrativos actualizados |
| `4.1.1.2.1` | Porcentaje de UO con estudio de ambiente de trabajo aplicado. | Laura Gabriela Calvario | Encuesta de ambiente de trabajo |
| `4.1.1.3.1` | Porcentaje de cumplimiento de la gestion documental y administracion de archivos. | Claudia Raquel Pina Andrade | Administracion del SUA |
| `4.1.1.3.2` | Porcentaje de efectividad del Sistema Universitario de Archivos para la gestion documental. | Ma. Guadalupe del Rocio Herrera Chacon | Administracion del SUA |
| `4.1.2.1.3` | Porcentaje de dependencias universitarias con infraestructura rehabilitada. | Oscar Pedraza Farias | Supervision escolar a planteles e incorporados |
| `4.1.2.1.6` | Porcentaje de dependencias universitarias que reciben equipamiento. | Oscar Pedraza Farias | Supervision escolar a planteles e incorporados |
| `4.1.2.2.1` | Porcentaje de UO que realizan mantenimiento preventivo o correctivo a infraestructura tecnologica. | Angel Ordonez Ayala | Mantenimiento preventivo a infraestructura tecnologica |
| `4.1.3.0.1` | Porcentaje de documentos normativos creados o actualizados. | Armando Hernandez Ramirez | Documentos normativos en creacion o actualizacion |
| `4.1.3.2.4` | Porcentaje de cobertura institucional de gestion del riesgo y atencion de emergencias. | Salvador Aguilar Aguilar | Programa Interno de Proteccion Civil |
| `4.1.4.3.3` | Porcentaje de personal universitario capacitado para fortalecer su competencia laboral. | Ma. Guadalupe del Rocio Herrera Chacon | Personal capacitado |
| `4.1.5.0.1` | Porcentaje de UO que ejecutan eficientemente su Programa Operativo Anual. | Armando Hernandez Ramirez | Programa Operativo Anual |
| `4.1.5.3.3` | Numero de acciones generadas para el cumplimiento del Programa Anual de Comunicacion Social. | Angel Ordonez Ayala | Campanas de comunicacion para promocion de oferta educativa |
| `4.1.6.1.1` | Tasa de variacion de recursos financieros generados por el quehacer institucional. | Ma. Guadalupe del Rocio Herrera Chacon | Generacion de recursos |

## Decision aplicada en el sistema

- Los indicadores oficiales sin plantel explicito se mantienen como `Sin plantel asignado` para no inventar alcance.
- Esos indicadores ya no bloquean captura de planteles; el plantel activo puede guardar su propia captura.
- Si el Director asigna planteles manualmente, el sistema vuelve a restringir captura solo a esos planteles.
