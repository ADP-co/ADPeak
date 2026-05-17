// ======================================================
// GENERADOR DE COLUMNAS DINÁMICAS
// ------------------------------------------------------
// Este módulo analiza los datos recibidos y genera
// automáticamente las columnas necesarias.
//
// Esto permite:
//
// - reutilizar tablas
// - soportar múltiples reportes
// - evitar columnas manuales
// ======================================================


// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

function obtenerColumnasDinamicas(datos) {

    // ==================================================
    // VALIDAR SI EXISTEN DATOS
    // ==================================================

    if (!datos || datos.length === 0) {

        return [];

    }


    // ==================================================
    // OBTENER PRIMER OBJETO
    // --------------------------------------------------
    // Usamos el primer registro para detectar
    // las propiedades disponibles.
    // ==================================================

    const primerRegistro = datos[0];


    // ==================================================
    // OBTENER NOMBRES DE COLUMNAS
    // ==================================================

    const columnas = Object.keys(primerRegistro);


    // ==================================================
    // RETORNAR COLUMNAS
    // ==================================================

    return columnas;

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports = obtenerColumnasDinamicas;