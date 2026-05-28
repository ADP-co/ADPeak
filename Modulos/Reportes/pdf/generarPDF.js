// generarPDF.js

const { jsPDF } =
    require("jspdf");


// ======================================================
// IMPORTAR MÓDULOS PDF
// ======================================================

const dibujarPortada =
    require("./portadaPDF");

const dibujarEncabezado =
    require("./encabezadoPDF");

const dibujarPiePagina =
    require("./piePaginaPDF");

const dibujarTabla =
    require("./tablaPDF");

const dibujarResumenGlobal =
    require("./resumenGlobalPDF");


// ======================================================
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------
// Esta función genera todo el documento PDF.
//
// Aquí se controla:
//
// - portada
// - encabezado
// - resumen global
// - tablas dinámicas
// - pie de página
// - guardado final
//
// Todo el contenido se dibuja dinámicamente
// dependiendo del tipo de reporte.
// ======================================================

function generarPDF(reporte) {

    // ==================================================
    // CREAR DOCUMENTO PDF
    // ==================================================

    const doc = new jsPDF();


    // ==================================================
    // DIBUJAR PORTADA
    // --------------------------------------------------
    // La portada siempre será la primera página
    // del documento institucional.
    // ==================================================

    dibujarPortada(

        doc,

        reporte

    );


    // ==================================================
    // CREAR NUEVA PÁGINA
    // --------------------------------------------------
    // Después de la portada comienza el contenido.
    // ==================================================

    doc.addPage();


    // ==================================================
    // DIBUJAR ENCABEZADO
    // ==================================================

    let posicionActual =

        dibujarEncabezado(

            doc,

            reporte

        );


    // ==================================================
    // VALIDAR REPORTE GLOBAL
    // --------------------------------------------------
    // Si el reporte es global se dibuja
    // el resumen administrativo institucional.
    // ==================================================

    if (

        reporte.tipoReporte ===

        "global"

    ) {

        posicionActual =

            dibujarResumenGlobal(

                doc,

                reporte,

                posicionActual

            );

    }


    // ==================================================
    // DIBUJAR TABLAS DINÁMICAS
    // --------------------------------------------------
    // Aquí se dibujan automáticamente todos
    // los indicadores y tablas del reporte.
    // ==================================================

    dibujarTabla(

        doc,

        reporte,

        posicionActual

    );


    // ==================================================
    // DIBUJAR PIE DE PÁGINA
    // --------------------------------------------------
    // Esto se realiza al final porque primero
    // es necesario conocer cuántas páginas
    // tiene el documento completo.
    // ==================================================

    dibujarPiePagina(

        doc,

        reporte

    );


    // ==================================================
    // GUARDAR PDF
    // ==================================================

    doc.save(

        "reporte1.pdf"

    );

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports =
    generarPDF;