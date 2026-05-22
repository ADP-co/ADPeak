// ======================================================
// OBTENER FECHA ACTUAL
// ======================================================

function obtenerFechaActual() {

    const fecha = new Date();

    return fecha.toLocaleDateString(

        "es-MX"

    );

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports = {

    obtenerFechaActual

};