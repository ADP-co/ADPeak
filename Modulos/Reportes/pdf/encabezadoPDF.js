// ======================================================
// ENCABEZADO INSTITUCIONAL DEL PDF
// ------------------------------------------------------
// Este módulo se encarga únicamente de dibujar
// el encabezado del documento PDF.
//
// Responsabilidad:
// - Título del reporte
// - Información básica (indicador, plantel, fecha)
//
// No debe contener lógica de tablas ni datos complejos.
// ======================================================


// Exportamos una función reutilizable
function dibujarEncabezado(doc, reporte) {

    // ==================================================
    // TÍTULO PRINCIPAL DEL REPORTE
    // ==================================================

    doc.setFontSize(18); // tamaño grande para título

    doc.text(reporte.titulo, 20, 20); // posición fija en PDF


    // ==================================================
    // INFORMACIÓN GENERAL
    // ==================================================

    doc.setFontSize(12); // tamaño estándar institucional

    doc.text(`Indicador: ${reporte.indicador}`, 20, 35);

    doc.text(`Plantel: ${reporte.plantel}`, 20, 45);

    doc.text(`Fecha: ${reporte.fechaGeneracion}`, 20, 55);

}


// Exportación del módulo
module.exports = dibujarEncabezado;