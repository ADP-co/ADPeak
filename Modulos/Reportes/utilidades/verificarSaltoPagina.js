// ======================================================
// VERIFICAR SALTO DE PÁGINA
// ------------------------------------------------------
// Esta función valida si todavía existe espacio
// suficiente para seguir escribiendo contenido.
//
// Si el contenido ya no cabe:
//
// - crea una nueva página
// - dibuja el encabezado secundario
// - regresa una nueva posición Y
//
// Esto ayuda a mantener el PDF limpio,
// ordenado y profesional.
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
    // OBTENER ALTURA TOTAL DE LA PÁGINA
    // ==============================================

    const alturaPagina =

        doc.internal.pageSize.height;



    // ==============================================
    // MARGEN INFERIOR DE SEGURIDAD
    // ------------------------------------------------
    // Se deja espacio para:
    //
    // - pie de página
    // - respiración visual
    // - evitar contenido pegado abajo
    // ==============================================

    const margenInferior = 15;



    // ==============================================
    // VALIDAR SI EL CONTENIDO YA NO CABE
    // ==============================================

    if (

        posicionY + espacioNecesario >

        alturaPagina - margenInferior

    ) {

        // ==========================================
        // CREAR NUEVA PÁGINA
        // ==========================================

        doc.addPage();



        // ==========================================
        // DIBUJAR ENCABEZADO SECUNDARIO
        // ==========================================

        dibujarEncabezadoSecundario(

            doc,
            reporte

        );



        // ==========================================
        // NUEVA POSICIÓN INICIAL
        // ------------------------------------------------
        // Se deja un espacio moderado para que
        // no se vea tan separado del encabezado.
        // ==========================================

        return 22;

    }



    // ==============================================
    // SI EL CONTENIDO CABE
    // ==============================================

    return posicionY;

}



// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports =
    verificarSaltoPagina;