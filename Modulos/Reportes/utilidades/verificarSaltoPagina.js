// ======================================================
// VERIFICAR SALTO DE PÁGINA
// ======================================================

const dibujarEncabezadoSecundario =
    require("../pdf/encabezadoSecundario");



function verificarSaltoPagina(

    doc,
    posicionY,
    espacioNecesario,
    reporte

) {

    // ==============================================
    // ALTURA MÁXIMA DE PÁGINA
    // ==============================================

    const alturaPagina =

        doc.internal.pageSize.height;



    // ==============================================
    // SI YA NO CABE CONTENIDO
    // ==============================================

    if (

        posicionY + espacioNecesario >

        alturaPagina - 20

    ) {

        // ==========================================
        // NUEVA PÁGINA
        // ==========================================

        doc.addPage();



        // ==========================================
        // ENCABEZADO PEQUEÑO
        // ==========================================

        dibujarEncabezadoSecundario(

            doc,
            reporte

        );



        // ==========================================
        // NUEVA POSICIÓN
        // ==========================================

        return 25;

    }



    // ==============================================
    // SI TODO CABE
    // ==============================================

    return posicionY;

}



module.exports =
    verificarSaltoPagina;