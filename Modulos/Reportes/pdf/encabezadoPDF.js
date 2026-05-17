// ======================================================
// IMPORTAR UTILIDADES
// ======================================================

const cargarImagenBase64 =
    require("../utilidades/cargarImg");



// ======================================================
// RUTA LOGO
// ======================================================

const rutaLogo =
    "Modulos/Reportes/Public/Imagenes/MediaSuperior-11.png";



// ======================================================
// CARGAR LOGO
// ======================================================

const logoBase64 =
    cargarImagenBase64(rutaLogo);



// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

function dibujarEncabezado(doc, reporte) {

    // Posición vertical dinámica
    let posicionY = 18;



    // ==================================================
    // LOGO
    // ==================================================

    doc.addImage(

        logoBase64,

        "PNG",

        15,

        10,

        28,

        13

    );



    // ==================================================
    // SISTEMA
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.setFontSize(20);

    doc.setTextColor(

        0,

        90,

        70

    );

    doc.text(

        reporte.sistema,

        55,

        posicionY

    );



    // ==================================================
    // TÍTULO REPORTE DINÁMICO
    // ==================================================

    posicionY += 12;

    doc.setTextColor(

        0,

        0,

        0

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    doc.setFontSize(15);



    const tituloReporte =

        `Reporte de ${reporte.identidadReporte.tipo} - ${reporte.identidadReporte.nombre}`;



    doc.text(

        tituloReporte,

        55,

        posicionY

    );



    // ==================================================
    // METADATA GENERAL
    // ==================================================

    posicionY += 14;

    doc.setFontSize(11);



    // ==================================================
    // LISTA INDICADORES
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );



    doc.text(

        "Indicadores incluidos:",

        15,

        posicionY

    );



    // ==================================================
    // DATOS DERECHA
    // ==================================================

    doc.setFont(

        "helvetica",

        "normal"

    );



    doc.text(

        `${reporte.identidadReporte.tipo}: ${reporte.identidadReporte.nombre}`,

        130,

        posicionY

    );



    doc.text(

        `Periodo: ${reporte.periodo}`,

        130,

        posicionY + 8

    );



    doc.text(

        `Fecha: ${reporte.fechaGeneracion}`,

        130,

        posicionY + 16

    );



    // ==================================================
    // RECORRER INDICADORES
    // ==================================================

    posicionY += 8;



    reporte.indicadores.forEach(

        (indicador) => {

            const indicadorPartido =

                doc.splitTextToSize(

                    `• ${indicador.nombre}`,

                    95

                );



            doc.text(

                indicadorPartido,

                20,

                posicionY

            );



            posicionY +=

                indicadorPartido.length * 6;

        }

    );



    // ==================================================
    // ESPACIO FINAL
    // ==================================================

    posicionY += 6;



    // ==================================================
    // LÍNEA DIVISORIA
    // ==================================================

    doc.setDrawColor(

        180,

        180,

        180

    );



    doc.line(

        15,

        posicionY,

        195,

        posicionY

    );



    // ==================================================
    // RETORNAR ALTURA FINAL
    // ==================================================

    return posicionY + 8;

}



// ======================================================
// EXPORTAR
// ======================================================

module.exports =
    dibujarEncabezado;