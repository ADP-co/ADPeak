// ======================================================
// IMPORTAR AUTOTABLE
// ------------------------------------------------------
// Esta librería permite crear tablas dinámicas
// dentro del PDF.
// ======================================================

const autoTable =
    require("jspdf-autotable").default;


// ======================================================
// IMPORTAR UTILIDADES
// ======================================================

const obtenerColumnasDinamicas =
    require("../utilidades/columnasDinamicas");

const verificarSaltoPagina =
    require("../utilidades/verificarSaltoPagina");

const {

    convertirObjetosAFilas

} = require("../utilidades/formateadores");



// ======================================================
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------
// Esta función se encarga de:
// - recorrer indicadores
// - generar tablas dinámicas
// - controlar saltos de página
// - aplicar estilos institucionales
// ======================================================

function dibujarTabla(

    doc,

    reporte,

    posicionInicialY

) {

    // ==================================================
    // CONTROLAR POSICIÓN VERTICAL
    // ==================================================

    let posicionY = posicionInicialY;


    // ==================================================
    // VALIDAR SI EXISTEN INDICADORES
    // ==================================================

    if (

        !reporte.indicadores ||

        reporte.indicadores.length === 0

    ) {

        doc.setFont(

            "helvetica",

            "italic"

        );

        doc.setFontSize(11);

        doc.text(

            "No existen indicadores disponibles.",

            15,

            posicionY

        );

        return;

    }


    // ==================================================
    // RECORRER TODOS LOS INDICADORES
    // ==================================================

    reporte.indicadores.forEach(

        (indicador) => {

            // ==========================================
            // OBTENER NOMBRE DINÁMICO
            // ------------------------------------------
            // Se valida por si algunos datos vienen
            // con mayúsculas o minúsculas.
            // ==========================================

            const nombreIndicador =

                indicador.nombre ||

                indicador.Nombre ||

                "Sin nombre";


            // ==========================================
            // OBTENER DESCRIPCIÓN DINÁMICA
            // ==========================================

            const descripcionIndicador =

                indicador.descripcion ||

                indicador.Descripcion ||

                "";


            // ==========================================
            // OBTENER DATOS DINÁMICOS
            // ==========================================

            const datosIndicador =

                indicador.datos ||

                indicador.Datos ||

                [];


            // ==========================================
            // VALIDAR SI EXISTEN DATOS
            // ==========================================

            if (

                datosIndicador.length === 0

            ) {

                doc.setFont(

                    "helvetica",

                    "italic"

                );

                doc.setFontSize(10);

                doc.text(

                    `No hay datos disponibles para ${nombreIndicador}.`,

                    15,

                    posicionY

                );

                posicionY += 15;

                return;

            }


            // ==========================================
            // GENERAR COLUMNAS DINÁMICAS
            // ==========================================

            const columnas =

                obtenerColumnasDinamicas(

                    datosIndicador

                );


            // ==========================================
            // GENERAR FILAS DINÁMICAS
            // ==========================================

            const filas =

                convertirObjetosAFilas(

                    datosIndicador

                );


            // ==========================================
            // CALCULAR ALTURA ESTIMADA
            // ------------------------------------------
            // Esto ayuda a controlar mejor
            // los saltos de página.
            // ==========================================

            const alturaTitulo = 15;

            const alturaDescripcion =

                descripcionIndicador
                    ? 10
                    : 0;

            const alturaTabla =

                filas.length * 10 + 35;


            const espacioEstimado =

                alturaTitulo +

                alturaDescripcion +

                alturaTabla;


            // ==========================================
            // VALIDAR SI EL BLOQUE CABE EN LA PÁGINA
            // ==========================================

            const bloqueGrande =

                espacioEstimado > 120;


            // ==========================================
            // SOLO FORZAR SALTO
            // EN BLOQUES PEQUEÑOS
            // ==========================================

            if (!bloqueGrande) {

                posicionY =

                    verificarSaltoPagina(

                        doc,

                        posicionY,

                        espacioEstimado,

                        reporte

                    );

            }


            // ==========================================
            // FONDO DEL TÍTULO
            // ==========================================

            doc.setFillColor(

                240,

                240,

                240

            );

            doc.rect(

                15,

                posicionY - 5,

                180,

                10,

                "F"

            );


            // ==========================================
            // TÍTULO DEL INDICADOR
            // ==========================================

            doc.setFont(

                "helvetica",

                "bold"

            );

            doc.setFontSize(13);


            // ==========================================
            // COLOR INSTITUCIONAL
            // ------------------------------------------
            // Se usa el verde institucional
            // de la universidad.
            // ==========================================

            doc.setTextColor(

                82,

                118,

                48

            );


            doc.text(

                nombreIndicador,

                20,

                posicionY + 1

            );


            // ==========================================
            // RESTAURAR COLOR NEGRO
            // ==========================================

            doc.setTextColor(

                0,

                0,

                0

            );


            // ==========================================
            // ESPACIO DESPUÉS DEL TÍTULO
            // ==========================================

            posicionY += 12;


            // ==========================================
            // DESCRIPCIÓN DEL INDICADOR
            // ==========================================

            if (

                descripcionIndicador

            ) {

                doc.setFont(

                    "helvetica",

                    "normal"

                );

                doc.setFontSize(10);


                // ======================================
                // DIVIDIR TEXTO SI ES MUY LARGO
                // ======================================

                const descripcionPartida =

                    doc.splitTextToSize(

                        descripcionIndicador,

                        170

                    );


                doc.text(

                    descripcionPartida,

                    15,

                    posicionY

                );


                posicionY +=

                    descripcionPartida.length * 5;

            }


            // ==========================================
            // CREAR TABLA DINÁMICA
            // ==========================================

            autoTable(doc, {

                // ======================================
                // COLUMNAS DINÁMICAS
                // ======================================

                columns: columnas,


                // ======================================
                // DATOS DINÁMICOS
                // ======================================

                body: datosIndicador,


                // ======================================
                // POSICIÓN INICIAL
                // ======================================

                startY:

                    posicionY + 4,


                // ======================================
                // ANCHO AUTOMÁTICO TABLA
                // ======================================

                tableWidth: "auto",


                // ======================================
                // ESTILOS GENERALES
                // ======================================

                styles: {

                    fontSize: 9,

                    cellPadding: 3,

                    overflow: "linebreak",

                    valign: "middle",

                    textColor: [

                        40,

                        40,

                        40

                    ],

                    lineColor: [

                        220,

                        220,

                        220

                    ],

                    lineWidth: 0.2

                },


                // ======================================
                // ESTILO ENCABEZADOS
                // ======================================

                headStyles: {

                    fillColor: [

                        82,

                        118,

                        48

                    ],

                    textColor: [

                        255,

                        255,

                        255

                    ],

                    fontStyle: "bold",

                    halign: "center"

                },


                // ======================================
                // FILAS ALTERNADAS
                // ======================================

                alternateRowStyles: {

                    fillColor: [

                        248,

                        248,

                        248

                    ]

                },


                // ======================================
                // PERSONALIZAR CELDAS
                // --------------------------------------
                // Detecta automáticamente:
                // - números
                // - porcentajes
                // - fechas
                //
                // y los centra.
                // ======================================

                didParseCell: function (data) {

                    if (

                        data.section === "body"

                    ) {

                        const valor =

                            String(

                                data.cell.raw

                            );


                        // ==============================
                        // DETECTAR NÚMEROS
                        // ==============================

                        const esNumero =

                            !isNaN(valor);


                        // ==============================
                        // DETECTAR PORCENTAJES
                        // ==============================

                        const esPorcentaje =

                            valor.includes("%");


                        // ==============================
                        // DETECTAR FECHAS
                        // ==============================

                        const esFecha =

                            valor.includes("/");


                        // ==============================
                        // CENTRAR AUTOMÁTICAMENTE
                        // ==============================

                        if (

                            esNumero ||

                            esPorcentaje ||

                            esFecha

                        ) {

                            data.cell.styles.halign =

                                "center";

                        }

                    }

                }

            });


            // ==========================================
            // ACTUALIZAR POSICIÓN FINAL
            // ------------------------------------------
            // Esto permite que el siguiente indicador
            // se dibuje debajo de la tabla actual.
            // ==========================================

            posicionY =

                doc.lastAutoTable.finalY + 10;

         
        }

    );

}




// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports =
    dibujarTabla;