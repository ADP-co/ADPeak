// ======================================================
// REPORTE DE EJEMPLO
// ------------------------------------------------------
// Este archivo contiene una estructura de datos simulada
// que representa cómo el backend enviará información
// al módulo de reportes.
//
// Su propósito es:
//
// - probar generación de PDFs
// - probar exportación CSV
// - generar tablas dinámicas
// - reutilizar información
//
// Esta estructura será reutilizable para distintos
// indicadores, planteles y tipos de reportes.
// ======================================================


// ======================================================
// OBJETO PRINCIPAL DEL REPORTE
// ======================================================

const reporteEjemplo = {

    // --------------------------------------------------
    // Título principal del reporte
    // --------------------------------------------------
    titulo: "Reporte General de Participación",


    // --------------------------------------------------
    // Nombre del indicador evaluado
    // --------------------------------------------------
    indicador: "Participación Estudiantil",


    // --------------------------------------------------
    // Nombre del plantel
    // --------------------------------------------------
    plantel: "Bachillerato 1",


    // --------------------------------------------------
    // Fecha de generación del reporte
    // --------------------------------------------------
    fechaGeneracion: "14/05/2026",


    // --------------------------------------------------
    // Columnas dinámicas de la tabla
    //
    // Estas columnas podrán cambiar dependiendo
    // del indicador recibido desde backend.
    // --------------------------------------------------
    columnas: [
        "Carrera",
        "Participantes",
        "Porcentaje"
    ],


    // --------------------------------------------------
    // Datos dinámicos del reporte
    //
    // Cada arreglo representa una fila.
    // --------------------------------------------------
    datos: [

        ["Informática", 120, "80%"],

        ["Contabilidad", 90, "70%"],

        ["Administración", 100, "75%"]

    ],


    // --------------------------------------------------
    // Observaciones institucionales
    // --------------------------------------------------
    observaciones:
        "Los datos corresponden al semestre enero-junio 2026."


};


// ======================================================
// EXPORTACIÓN DEL OBJETO
// ------------------------------------------------------
// Esto permitirá reutilizar el reporte desde:
//
// - PDF
// - CSV
// - tablas HTML
// ======================================================

module.exports = reporteEjemplo;