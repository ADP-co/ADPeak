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


// ======================================================
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------
// Esta función genera todo el documento PDF.
//
// Aquí se controla:
// - portada
// - encabezado
// - tablas
// - pie de página
// - guardado final
// ======================================================

function generarPDF(reporte) {

    // ==================================================
    // CREAR DOCUMENTO PDF
    // ==================================================

    const doc = new jsPDF();


    // ==================================================
    // DIBUJAR PORTADA
    // ==================================================

    dibujarPortada(

        doc,

        reporte

    );


    // ==================================================
    // CREAR NUEVA PÁGINA
    // --------------------------------------------------
    // La portada ocupa la primera página.
    // El contenido inicia desde la segunda.
    // ==================================================

    doc.addPage();


    // ==================================================
    // DIBUJAR ENCABEZADO
    // ==================================================

    const posicionFinalEncabezado =

        dibujarEncabezado(

            doc,

            reporte

        );


    // ==================================================
    // DIBUJAR TABLAS
    // ==================================================

    dibujarTabla(

        doc,

        reporte,

        posicionFinalEncabezado

    );


    // ==================================================
    // DIBUJAR PIE DE PÁGINA
    // --------------------------------------------------
    // Esto se hace al final porque primero
    // necesitamos saber cuántas páginas
    // tiene el documento.
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