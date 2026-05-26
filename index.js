// ======================================================
// ARCHIVO PRINCIPAL DEL PROYECTO
// ------------------------------------------------------
// Este archivo funciona como punto de entrada principal
// para ejecutar pruebas del módulo de reportes.
//
// Desde aquí:
//
// - cargamos datos de prueba
// - llamamos generación PDF
// - probamos funcionalidades
//
// ======================================================


// ======================================================
// IMPORTAR RUTAS REPORTES
// ======================================================

const reportesRoutes =
    require("./Modulos/Reportes/routes/reportes.routes");



// ======================================================
// USAR RUTAS
// ======================================================

app.use(

    "/api/reportes",

    reportesRoutes

);


// ======================================================
// IMPORTAR REPORTE DE EJEMPLO
// ------------------------------------------------------
// Este archivo contiene datos simulados que representan
// información enviada desde backend.
// ======================================================

const reporteEjemplo = require("./Modulos/Reportes/datos/reporteEjemplo");


// ======================================================
// MOSTRAR DATOS EN CONSOLA
// ------------------------------------------------------
// Esto nos ayuda a verificar que los datos se estén
// cargando correctamente.
// ======================================================

console.log("====================================");
console.log("REPORTE CARGADO CORRECTAMENTE");
console.log("====================================");

console.log(reporteEjemplo);
// ======================================================
// IMPORTAR GENERADOR DE PDF
// ======================================================

const generarPDF = require("./Modulos/Reportes/pdf/generarPDF");


// ======================================================
// GENERAR PDF UTILIZANDO DATOS DINÁMICOS
// ======================================================

generarPDF(reporteEjemplo);