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

// ======================================================
// FORMATEAR TÍTULOS
// ======================================================

function formatearTitulo(texto) {

    return texto

        .replace(/_/g, " ")

        .replace(

            /\b\w/g,

            letra => letra.toUpperCase()

        );

}



// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

function obtenerColumnasDinamicas(datos) {

    if (!datos || datos.length === 0) {

        return [];

    }



    const primerRegistro = datos[0];



    // ==================================================
    // CREAR COLUMNAS PARA AUTOTABLE
    // ==================================================

    const columnas = Object.keys(

        primerRegistro

    ).map(

        clave => ({

            header:

                formatearTitulo(clave),

            dataKey:

                clave

        })

    );



    return columnas;

}



// ======================================================
// EXPORTAR
// ======================================================

module.exports = obtenerColumnasDinamicas;