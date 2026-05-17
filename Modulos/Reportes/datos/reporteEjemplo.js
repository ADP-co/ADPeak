// ======================================================
// REPORTE POR RESPONSABLE
// ======================================================

const reporte = {

    // ==================================================
    // TIPO REPORTE
    // ==================================================

    tipoReporte: "responsable",



    // ==================================================
    // IDENTIDAD DEL REPORTE
    // ==================================================

    identidadReporte: {

        tipo: "Responsable",

        nombre: "Dra. María Fernanda López"

    },



    // ==================================================
    // DATOS GENERALES
    // ==================================================

    sistema: "SIGI-POA DGEMS",

    periodo: "Enero-Junio 2026",

    cicloEscolar: "2026-A",

    fechaGeneracion: "16/05/2026",

    generadoPor: "Sistema Institucional DGEMS",



    // ==================================================
    // INDICADORES ASIGNADOS
    // ==================================================

    indicadores: [

        // ==============================================
        // INDICADOR 1
        // ==============================================

        {

            nombre:

                "Participación Académica",



            descripcion:

                "Evalúa la participación estudiantil en actividades académicas institucionales.",



            datos: [

                {

                    grupo: "2A",

                    alumnos: 38,

                    participacion: "85%",

                    tutor: "Juan Pérez"

                },

                {

                    grupo: "2B",

                    alumnos: 41,

                    participacion: "90%",

                    tutor: "Laura Mendoza"

                }

            ]

        },



        // ==============================================
        // INDICADOR 2
        // ==============================================

        {

            nombre:

                "Rendimiento Escolar",



            descripcion:

                "Muestra el promedio académico y alumnos reprobados por grupo.",



            datos: [

                {

                    semestre: "2",

                    grupo: "A",

                    promedio: 8.7,

                    reprobados: 2

                },

                {

                    semestre: "4",

                    grupo: "B",

                    promedio: 9.1,

                    reprobados: 1

                }

            ]

        },



        // ==============================================
        // INDICADOR 3
        // ==============================================

        {

            nombre:

                "Capacitación Docente",



            descripcion:

                "Información sobre cursos tomados por docentes.",



            datos: [

                {

                    docente: "Carlos Ramírez",

                    curso: "Planeación Académica",

                    horas: 20,

                    estado: "Completado"

                },

                {

                    docente: "Ana Torres",

                    curso: "Herramientas Digitales",

                    horas: 15,

                    estado: "En proceso"

                }

            ]

        },



        // ==============================================
        // INDICADOR 4
        // ==============================================

        {

            nombre:

                "Vinculación Comunitaria",



            descripcion:

                "Actividades comunitarias organizadas por el plantel.",



            datos: [

                {

                    actividad: "Campaña ecológica",

                    participantes: 120,

                    fecha: "12/03/2026"

                },

                {

                    actividad: "Conferencia ambiental",

                    participantes: 85,

                    fecha: "25/04/2026"

                }

            ]

        }

    ]

};



// ======================================================
// EXPORTAR
// ======================================================

module.exports = reporte;