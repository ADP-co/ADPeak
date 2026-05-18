// ======================================================
// ENCABEZADO SECUNDARIO
// ======================================================

function dibujarEncabezadoSecundario(
    doc,
    reporte
) {

    // ==============================================
    // FUENTE
    // ==============================================

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.setFontSize(10);



    // ==============================================
    // TEXTO
    // ==============================================

    doc.text(

        `${reporte.sistema} | Reporte de ${reporte.identidadReporte.tipo}`,

        15,

        12

    );



    // ==============================================
    // LÍNEA
    // ==============================================

    doc.setDrawColor(

        180,

        180,

        180

    );



    doc.line(

        15,

        16,

        195,

        16

    );

}

module.exports =
    dibujarEncabezadoSecundario;