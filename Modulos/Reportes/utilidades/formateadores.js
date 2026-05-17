// ======================================================
// FORMATEADORES DE DATOS
// ------------------------------------------------------
// Este módulo transforma estructuras de datos
// para que puedan utilizarse en tablas PDF.
//
// Responsabilidad:
//
// - convertir objetos a filas
// - adaptar datos backend
// - preparar información para AutoTable
// ======================================================


// ======================================================
// CONVERTIR OBJETOS A FILAS
// ------------------------------------------------------
// Esta función recibe un arreglo de objetos
// y devuelve un arreglo de filas.
//
// EJEMPLO:
//
// [
//   {
//      plantel: "Bachillerato 1",
//      alumnos: 300
//   }
// ]
//
// SE CONVIERTE EN:
//
// [
//   ["Bachillerato 1", 300]
// ]
// ======================================================

function convertirObjetosAFilas(datos) {

    // ==================================================
    // VALIDAR DATOS
    // ==================================================

    if (!datos || datos.length === 0) {

        return [];

    }


    // ==================================================
    // TRANSFORMAR OBJETOS EN FILAS
    // ==================================================

    const filas = datos.map(registro => {

        // Object.values obtiene los valores
        // del objeto actual
        return Object.values(registro);

    });


    // ==================================================
    // RETORNAR FILAS
    // ==================================================

    return filas;

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports = {

    convertirObjetosAFilas

};