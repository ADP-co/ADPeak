const { jsPDF } =
    require("jspdf");



const dibujarEncabezado =
    require("./encabezadoPDF");



const dibujarTabla =
    require("./tablaPDF");



function generarPDF(reporte) {

    const doc = new jsPDF();



    // ==================================================
    // ENCABEZADO
    // ==================================================

    const posicionFinalEncabezado =

        dibujarEncabezado(

            doc,

            reporte

        );



    // ==================================================
    // TABLAS
    // ==================================================

    dibujarTabla(

        doc,

        reporte,

        posicionFinalEncabezado

    );



    // ==================================================
    // GUARDAR PDF
    // ==================================================

    doc.save(

        "reporte.pdf"

    );

}



module.exports =
    generarPDF;