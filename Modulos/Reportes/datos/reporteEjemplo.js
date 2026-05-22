// ======================================================
// REPORTE POR PLANTEL
// ======================================================

const reporte = {

    // ==================================================
    // TIPO DE REPORTE
    // ==================================================

    tipoReporte: "plantel",



    // ==================================================
    // IDENTIDAD DEL REPORTE
    // ==================================================

    identidadReporte: {

        tipo: "Plantel",

        nombre: "Bachillerato No. 04 Villa de Álvarez"

    },



    // ==================================================
    // DATOS GENERALES
    // ==================================================

    sistema: "SIGI-POA DGEMS",

    periodo: "Enero - Junio 2026",

    cicloEscolar: "2026-A",

    generadoPor: "Sistema Institucional DGEMS",



    // ==================================================
    // INDICADORES
    // ==================================================

    indicadores: [

        // ==================================================
        // INDICADOR 1
        // ==================================================

        {

            nombre:

                "Participación Académica Estudiantil",



            descripcion:

                "Este indicador muestra el nivel de participación de estudiantes en actividades académicas y de integración institucional.",



            datos: [

                {
                    grupo: "2A",
                    alumnos: 42,
                    participacion: "88%",
                    tutor: "María González",
                    turno: "Matutino"
                },

                {
                    grupo: "2B",
                    alumnos: 39,
                    participacion: "91%",
                    tutor: "Carlos Ramírez",
                    turno: "Matutino"
                },

                {
                    grupo: "2C",
                    alumnos: 44,
                    participacion: "79%",
                    tutor: "Laura Torres",
                    turno: "Vespertino"
                },

                {
                    grupo: "4A",
                    alumnos: 40,
                    participacion: "93%",
                    tutor: "José Mendoza",
                    turno: "Matutino"
                },

                {
                    grupo: "4B",
                    alumnos: 37,
                    participacion: "85%",
                    tutor: "Ana López",
                    turno: "Vespertino"
                },

                {
                    grupo: "6A",
                    alumnos: 35,
                    participacion: "95%",
                    tutor: "Miguel Chávez",
                    turno: "Matutino"
                }

            ]

        },



        // ==================================================
        // INDICADOR 2
        // ==================================================

        {

            nombre:

                "Rendimiento Escolar General",



            descripcion:

                "Permite visualizar promedios generales y alumnos reprobados por grupo durante el semestre.",



            datos: [

                {
                    semestre: "2",
                    grupo: "A",
                    promedio: 8.9,
                    reprobados: 1,
                    aprobados: 41
                },

                {
                    semestre: "2",
                    grupo: "B",
                    promedio: 8.4,
                    reprobados: 3,
                    aprobados: 36
                },

                {
                    semestre: "4",
                    grupo: "A",
                    promedio: 9.1,
                    reprobados: 0,
                    aprobados: 40
                },

                {
                    semestre: "4",
                    grupo: "B",
                    promedio: 8.2,
                    reprobados: 4,
                    aprobados: 33
                },

                {
                    semestre: "6",
                    grupo: "A",
                    promedio: 9.3,
                    reprobados: 0,
                    aprobados: 35
                }

            ]

        },



        // ==================================================
        // INDICADOR 3
        // ==================================================

        {

            nombre:

                "Capacitación y Actualización Docente",



            descripcion:

                "Información relacionada con cursos y capacitaciones tomadas por docentes del plantel.",



            datos: [

                {
                    docente: "Carlos Ramírez",
                    curso: "Planeación Académica",
                    horas: 20,
                    estado: "Completado",
                    fecha: "12/02/2026"
                },

                {
                    docente: "Ana Torres",
                    curso: "Herramientas Digitales",
                    horas: 15,
                    estado: "En proceso",
                    fecha: "18/03/2026"
                },

                {
                    docente: "Luis Hernández",
                    curso: "Evaluación por Competencias",
                    horas: 25,
                    estado: "Completado",
                    fecha: "07/04/2026"
                },

                {
                    docente: "Martha Silva",
                    curso: "Uso de Plataformas Educativas",
                    horas: 18,
                    estado: "Completado",
                    fecha: "21/04/2026"
                }

            ]

        },



        // ==================================================
        // INDICADOR 4
        // ==================================================

        {

            nombre:

                "Vinculación Comunitaria",



            descripcion:

                "Actividades comunitarias organizadas por el plantel con participación estudiantil.",



            datos: [

                {
                    actividad: "Campaña ecológica",
                    participantes: 120,
                    fecha: "12/03/2026",
                    responsable: "Departamento Académico"
                },

                {
                    actividad: "Conferencia ambiental",
                    participantes: 85,
                    fecha: "25/04/2026",
                    responsable: "Coordinación Cultural"
                },

                {
                    actividad: "Reforestación comunitaria",
                    participantes: 140,
                    fecha: "09/05/2026",
                    responsable: "Tutorías"
                }

            ]

        },



        // ==================================================
        // INDICADOR 5
        // ==================================================

        {

            nombre:

                "Seguimiento de Tutorías Académicas",



            descripcion:

                "Muestra el seguimiento realizado a estudiantes con bajo rendimiento académico.",



            datos: [

                {
                    alumno: "Juan Pérez",
                    grupo: "2A",
                    promedio: 6.8,
                    sesiones: 4,
                    estado: "En seguimiento"
                },

                {
                    alumno: "Andrea López",
                    grupo: "2B",
                    promedio: 7.1,
                    sesiones: 3,
                    estado: "Regularizado"
                },

                {
                    alumno: "Miguel Torres",
                    grupo: "4A",
                    promedio: 6.5,
                    sesiones: 5,
                    estado: "En seguimiento"
                },

                {
                    alumno: "Fernanda Ruiz",
                    grupo: "6A",
                    promedio: 7.0,
                    sesiones: 2,
                    estado: "Regularizado"
                }

            ]

        }

    ]

};



// ======================================================
// EXPORTAR REPORTE
// ======================================================

module.exports = reporte;