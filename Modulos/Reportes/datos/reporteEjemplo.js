// ======================================================
// REPORTE GLOBAL ADMINISTRATIVO
// ------------------------------------------------------
// Este objeto simula la información que backend
// enviaría al módulo PDF.
//
// Se utiliza para probar:
//
// - portada
// - resumen global
// - tablas dinámicas
// - indicadores
// - estilos institucionales
// - múltiples páginas
// ======================================================

const reporte = {

    // ==================================================
    // TIPO DE REPORTE
    // ==================================================

    tipoReporte: "global",


    // ==================================================
    // IDENTIDAD DEL REPORTE
    // ==================================================

    identidadReporte: {

        tipo: "Global",

        nombre:
            "Reporte Administrativo Institucional"

    },


    // ==================================================
    // INFORMACIÓN GENERAL
    // ==================================================

    periodo:
        "Enero - Junio 2026",

    cicloEscolar:
        "2026-A",

    generadoPor:
        "Administrador General DGEMS",


    // ==================================================
    // RESUMEN GLOBAL
    // --------------------------------------------------
    // Este bloque se utiliza únicamente
    // en los reportes globales.
    // ==================================================

    resumenGlobal: {

        totalPlanteles: 24,

        totalResponsables: 63,

        totalIndicadores: 18,

        reportesEnviados: 21,

        reportesAprobados: 17,

        reportesObservados: 3,

        reportesAtrasados: 1,

        porcentajeAvance: "88%"

    },


    // ==================================================
    // INDICADORES
    // ==================================================

    indicadores: [

        // ==============================================
        // INDICADOR 1
        // ==============================================

        {

            nombre:
                "Participación Académica Estudiantil",

            descripcion:
                "Este indicador muestra el nivel de participación de estudiantes en actividades académicas institucionales.",

            datos: [

                {

                    plantel: "Plantel Colima",

                    alumnos: 540,

                    participantes: 498,

                    avance: "92%"

                },

                {

                    plantel: "Plantel Tecomán",

                    alumnos: 480,

                    participantes: 401,

                    avance: "83%"

                },

                {

                    plantel: "Plantel Villa de Álvarez",

                    alumnos: 620,

                    participantes: 577,

                    avance: "93%"

                },

                {

                    plantel: "Plantel Manzanillo",

                    alumnos: 510,

                    participantes: 452,

                    avance: "88%"

                }

            ]

        },


        // ==============================================
        // INDICADOR 2
        // ==============================================

        {

            nombre:
                "Seguimiento de Tutorías Académicas",

            descripcion:
                "Permite visualizar el seguimiento realizado a estudiantes con riesgo académico.",

            datos: [

                {

                    responsable:
                        "Mtra. Laura Torres",

                    tutorias:
                        34,

                    alumnosAtendidos:
                        98,

                    porcentajeSeguimiento:
                        "90%"

                },

                {

                    responsable:
                        "Dr. Miguel Hernández",

                    tutorias:
                        29,

                    alumnosAtendidos:
                        81,

                    porcentajeSeguimiento:
                        "85%"

                },

                {

                    responsable:
                        "Lic. Ana Martínez",

                    tutorias:
                        31,

                    alumnosAtendidos:
                        92,

                    porcentajeSeguimiento:
                        "93%"

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
                "Contiene información relacionada con cursos y capacitaciones realizadas por el personal docente.",

            datos: [

                {

                    plantel:
                        "Plantel Colima",

                    docentes:
                        65,

                    capacitados:
                        58,

                    avance:
                        "89%"

                },

                {

                    plantel:
                        "Plantel Tecomán",

                    docentes:
                        52,

                    capacitados:
                        43,

                    avance:
                        "82%"

                },

                {

                    plantel:
                        "Plantel Manzanillo",

                    docentes:
                        60,

                    capacitados:
                        56,

                    avance:
                        "93%"

                }

            ]

        },


        // ==============================================
        // INDICADOR 4
        // ==============================================

        {

            nombre:
                "Entrega de Reportes Institucionales",

            descripcion:
                "Muestra el estado general de cumplimiento en la entrega de reportes por plantel.",

            datos: [

                {

                    plantel:
                        "Plantel Colima",

                    estado:
                        "Aprobado",

                    fechaEntrega:
                        "20/05/2026"

                },

                {

                    plantel:
                        "Plantel Tecomán",

                    estado:
                        "Observado",

                    fechaEntrega:
                        "19/05/2026"

                },

                {

                    plantel:
                        "Plantel Villa de Álvarez",

                    estado:
                        "Aprobado",

                    fechaEntrega:
                        "18/05/2026"

                },

                {

                    plantel:
                        "Plantel Manzanillo",

                    estado:
                        "Pendiente",

                    fechaEntrega:
                        "Sin entrega"

                }

            ]

        }

    ]

};


// ======================================================
// EXPORTAR REPORTE
// ======================================================

module.exports =
    reporte;