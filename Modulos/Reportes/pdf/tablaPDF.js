const autoTable =
    require("jspdf-autotable").default;

const obtenerColumnasDinamicas =
    require("../utilidades/columnasDinamicas");

const verificarSaltoPagina =
    require("../utilidades/verificarSaltoPagina");

const {

    convertirObjetosAFilas

} = require("../utilidades/formateadores");


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
            // FONDO TÍTULO INDICADOR
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
            // TEXTO INDICADOR
            // ==========================================

            doc.setFont(

                "helvetica",

                "bold"

            );



            doc.setFontSize(13);



            doc.setTextColor(

                0,

                90,

                70

            );



            doc.text(

                indicador.nombre,

                20,

                posicionY + 1

            );



            // ==========================================
            // RESTAURAR COLOR TEXTO
            // ==========================================

            doc.setTextColor(

                0,

                0,

                0

            );



            // ==========================================
            // ESPACIO DESPUÉS TÍTULO
            // ==========================================

            posicionY += 12;



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
            // ALTURA TÍTULO
            // ==========================================

            const alturaTitulo = 15;



            // ==========================================
            // ALTURA DESCRIPCIÓN
            // ==========================================

            let alturaDescripcion = 0;



            if (indicador.descripcion) {

                const descripcionPartida =

                    doc.splitTextToSize(

                        indicador.descripcion,

                        170

                    );



                alturaDescripcion =

                    descripcionPartida.length * 5;

            }



            // ==========================================
            // ALTURA TABLA
            // ==========================================

            const alturaTabla =

                filas.length * 10 + 30;



            // ==========================================
            // ESPACIO TOTAL NECESARIO
            // ==========================================

            const espacioEstimado =

                alturaTitulo +

                alturaDescripcion +

                alturaTabla;
            // ==========================================
            // VERIFICAR SALTO DE PÁGINA
            // ==========================================

            // ==========================================
            // DEFINIR SI BLOQUE ES GRANDE
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