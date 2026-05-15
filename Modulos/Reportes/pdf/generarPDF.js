// ======================================================
// GENERADOR PRINCIPAL DE PDF (ORQUESTADOR)
// ------------------------------------------------------
// Este archivo SOLO coordina los módulos:
//
// - encabezadoPDF
// - tablaPDF
//
// NO dibuja nada directamente.
// ======================================================


// Librería PDF
const { jsPDF } = require("jspdf");


// Importamos módulos creados
const dibujarEncabezado = require("./encabezadoPDF");
const dibujarTabla = require("./tablaPDF");


// Función principal
function generarPDF(reporte) {

    // Crear documento
    const doc = new jsPDF();


    // ==================================================
    // PASO 1: ENCABEZADO
    // ==================================================

    dibujarEncabezado(doc, reporte);


    // ==================================================
    // PASO 2: TABLA
    // ==================================================

    dibujarTabla(doc, reporte);


    // ==================================================
    // GUARDAR PDF
    // ==================================================

    doc.save("reporte.pdf");


    console.log("PDF generado correctamente");
}


// Exportar
module.exports = generarPDF;