// ======================================================
// IMPORTAR LIBRERÍAS
// ======================================================

const autoTable =
    require("jspdf-autotable").default;



// ======================================================
// IMPORTAR UTILIDADES
// ======================================================

const obtenerColumnasDinamicas =
    require("../utilidades/columnasDinamicas");



const {

    convertirObjetosAFilas

} = require("../utilidades/formateadores");



// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

function dibujarTabla(

    doc,

    reporte,

    posicionInicialY

) {

    // Controla la altura dinámica
    let posicionY = posicionInicialY;



    // ==================================================
    // VALIDAR INDICADORES
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
    // RECORRER INDICADORES
    // ==================================================

    reporte.indicadores.forEach(

        (indicador) => {

            // ==========================================
            // VALIDAR DATOS
            // ==========================================

            if (

                !indicador.datos ||

                indicador.datos.length === 0

            ) {

                doc.setFont(

                    "helvetica",

                    "italic"

                );



                doc.setFontSize(10);



                doc.text(

                    `No hay datos disponibles para ${indicador.nombre}.`,

                    15,

                    posicionY

                );



                posicionY += 15;

                return;

            }



            // ==========================================
            // TÍTULO INDICADOR
            // ==========================================

            doc.setFont(

                "helvetica",

                "bold"

            );



            doc.setFontSize(13);



            doc.text(

                indicador.nombre,

                15,

                posicionY

            );



            posicionY += 8;



            // ==========================================
            // DESCRIPCIÓN
            // ==========================================

            if (

                indicador.descripcion

            ) {

                doc.setFont(

                    "helvetica",

                    "normal"

                );



                doc.setFontSize(10);



                const descripcionPartida =

                    doc.splitTextToSize(

                        indicador.descripcion,

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
            // COLUMNAS DINÁMICAS
            // ==========================================

            const columnas =

                obtenerColumnasDinamicas(

                    indicador.datos

                );



            // ==========================================
            // FILAS DINÁMICAS
            // ==========================================

            const filas =

                convertirObjetosAFilas(

                    indicador.datos

                );



            // ==========================================
            // CREAR TABLA
            // ==========================================

            autoTable(doc, {

                head: [columnas],

                body: filas,



                startY:

                    posicionY + 4,



                styles: {

                    fontSize: 10

                },



                headStyles: {

                    fillColor: [

                        0,

                        90,

                        70

                    ]

                }

            });



            // ==========================================
            // ACTUALIZAR ALTURA
            // ==========================================

            posicionY =

                doc.lastAutoTable.finalY + 15;

        }

    );

}



// ======================================================
// EXPORTAR
// ======================================================

module.exports =
    dibujarTabla;