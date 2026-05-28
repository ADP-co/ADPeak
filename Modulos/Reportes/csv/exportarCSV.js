// ======================================================
// IMPORTAR GENERADOR CSV
// ======================================================

const generarIndicadorCSV =
    require("./generarIndicadorCSV");


// ======================================================
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------
// Esta función controla la exportación
// general del archivo CSV.
// ======================================================

function exportarCSV(reporte) {

    generarIndicadorCSV(reporte);

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports =
    exportarCSV;