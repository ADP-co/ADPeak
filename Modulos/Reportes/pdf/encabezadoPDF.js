// ======================================================
// IMPORTAR UTILIDADES
// ------------------------------------------------------
// Esta utilidad convierte el logo a Base64 para poder
// insertarlo directamente en el PDF.
// ======================================================

const cargarImagenBase64 =
    require("../utilidades/cargarImg");


// ======================================================
// IMPORTAR FECHA AUTOMÁTICA
// ------------------------------------------------------
// Esta utilidad genera automáticamente la fecha actual
// del sistema para mostrarla dentro del reporte.
// ======================================================

const {

    obtenerFechaActual

} = require("../utilidades/fechas");


// ======================================================
// NOMBRE DEL SISTEMA
// ======================================================

const SISTEMA =
    "SIGI-POA DGEMS";


// ======================================================
// RUTA DEL LOGO
// ------------------------------------------------------
// Se utiliza el logo institucional del sistema.
// ======================================================

const rutaLogo =
    "Modulos/Reportes/Public/Imagenes/MediaSuperior-11.png";


// ======================================================
// CARGAR LOGO EN BASE64
// ------------------------------------------------------
// Esto permite insertar la imagen dentro del PDF.
// ======================================================

const logoBase64 =
    cargarImagenBase64(rutaLogo);



// ======================================================
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------
// Esta función se encarga de dibujar todo el encabezado
// superior del PDF.
//
// Incluye:
//
// - Logo
// - Nombre del sistema
// - Título dinámico del reporte
// - Información general
// - Lista de indicadores
//
// Además todo se adapta automáticamente dependiendo
// de la longitud del texto.
// ======================================================

function dibujarEncabezado(doc, reporte) {

    // ==================================================
    // POSICIÓN INICIAL VERTICAL
    // --------------------------------------------------
    // Esta variable controla en qué altura se va
    // dibujando el contenido.
    // ==================================================

    let posicionY = 18;



    // ==================================================
    // INSERTAR LOGO
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
    // NOMBRE DEL SISTEMA
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );



    doc.setFontSize(20);



    // Color gris institucional suave
    doc.setTextColor(

        78,

        77,

        77

    );



    doc.text(

        SISTEMA,

        55,

        posicionY

    );



    // ==================================================
    // TÍTULO DEL REPORTE
    // --------------------------------------------------
    // Aquí se genera dinámicamente el nombre del
    // reporte dependiendo del responsable o tipo.
    // ==================================================

    posicionY += 12;



    doc.setFont(

        "helvetica",

        "normal"

    );



    doc.setFontSize(14);



    // Restaurar color negro
    doc.setTextColor(

        0,

        0,

        0

    );



    // ==================================================
    // TEXTO DINÁMICO
    // ==================================================

    const identidadTexto =

        `Reporte de ${reporte.identidadReporte.tipo} - ${reporte.identidadReporte.nombre}`;



    // ==================================================
    // DIVIDIR TEXTO AUTOMÁTICAMENTE
    // --------------------------------------------------
    // Si el nombre es muy largo se baja automáticamente
    // a otra línea para evitar salirse del margen.
    // ==================================================

    const identidadPartida =

        doc.splitTextToSize(

            identidadTexto,

            90

        );



    // ==================================================
    // DIBUJAR TEXTO DEL REPORTE
    // ==================================================

    doc.text(

        identidadPartida,

        55,

        posicionY

    );



    // ==================================================
    // CALCULAR ALTURA DINÁMICA
    // --------------------------------------------------
    // Dependiendo de cuántas líneas ocupe el título,
    // se ajusta automáticamente el resto del contenido.
    // ==================================================

    const alturaIdentidad =

        identidadPartida.length * 6;



    // ==================================================
    // ACTUALIZAR POSICIÓN
    // ==================================================

    posicionY += alturaIdentidad + 9;



    // ==================================================
    // CONFIGURACIÓN GENERAL DEL TEXTO
    // ==================================================

    doc.setFontSize(11);



    // ==================================================
    // TÍTULO DE INDICADORES
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );



    doc.text(

        "Indicadores evaluados",

        15,

        posicionY

    );



    // ==================================================
    // INFORMACIÓN GENERAL DERECHA
    // --------------------------------------------------
    // Esta parte muestra:
    //
    // - Periodo
    // - Fecha
    //
    // Se acomoda dinámicamente para evitar que
    // los textos se encimen.
    // ==================================================

    let metadataY = posicionY;



    // ==================================================
    // PERIODO
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );



    doc.text(

        "Periodo:",

        125,

        metadataY

    );



    doc.setFont(

        "helvetica",

        "normal"

    );



    const periodoPartido =

        doc.splitTextToSize(

            reporte.periodo,

            42

        );



    doc.text(

        periodoPartido,

        150,

        metadataY

    );



    // Ajustar altura automática
    metadataY +=

        periodoPartido.length * 5 + 4;



    // ==================================================
    // FECHA AUTOMÁTICA
    // --------------------------------------------------
    // La fecha se genera automáticamente utilizando
    // la utilidad de fechas del sistema.
    // ==================================================

    doc.setFont(

        "helvetica",

        "bold"

    );



    doc.text(

        "Fecha:",

        125,

        metadataY

    );



    doc.setFont(

        "helvetica",

        "normal"

    );



    const fechaPartida =

        doc.splitTextToSize(

            obtenerFechaActual(),

            42

        );



    doc.text(

        fechaPartida,

        150,

        metadataY

    );



    // Ajustar altura automática
    metadataY +=

        fechaPartida.length * 5 + 4;



    // ==================================================
    // ESPACIO DESPUÉS DEL TÍTULO
    // ==================================================

    posicionY += 8;



    // ==================================================
    // LISTA DE INDICADORES
    // --------------------------------------------------
    // Aquí se recorren todos los indicadores incluidos
    // dentro del reporte.
    // ==================================================

    reporte.indicadores.forEach(

        (indicador) => {

            // ==========================================
            // VALIDAR NOMBRE DEL INDICADOR
            // --------------------------------------------------
            // Se valida por seguridad porque algunos datos
            // vienen con mayúsculas y otros con minúsculas.
            // ==========================================

            const nombreIndicador =

                indicador.nombre ||

                indicador.Nombre ||

                "Sin nombre";



            // ==========================================
            // DIVIDIR TEXTO SI ES LARGO
            // ==========================================

            const indicadorPartido =

                doc.splitTextToSize(

                    `• ${nombreIndicador}`,

                    95

                );



            // ==========================================
            // DIBUJAR TEXTO
            // ==========================================

            doc.setFont(

                "helvetica",

                "normal"

            );



            doc.text(

                indicadorPartido,

                20,

                posicionY

            );



            // ==========================================
            // AJUSTAR POSICIÓN DINÁMICAMENTE
            // ==========================================

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
    // --------------------------------------------------
    // Se utiliza para separar visualmente el encabezado
    // del contenido principal del reporte.
    // ==================================================

    doc.setDrawColor(

        200,

        200,

        200

    );



    doc.line(

        15,

        posicionY,

        195,

        posicionY

    );



    // ==================================================
    // RETORNAR ALTURA FINAL
    // --------------------------------------------------
    // Esto permite que el siguiente módulo continúe
    // dibujando desde la posición correcta.
    // ==================================================

    return posicionY + 8;

}



// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports =
    dibujarEncabezado;