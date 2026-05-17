// ======================================================
// UTILIDAD PARA CARGAR IMÁGENES
// ------------------------------------------------------
// Este módulo convierte imágenes locales
// a formato Base64 para utilizarlas
// dentro de jsPDF.
// ======================================================


// Módulo de archivos Node.js
const fs = require("fs");


// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

function cargarImagenBase64(rutaImagen) {

    // Leer imagen como buffer
    const imagen = fs.readFileSync(rutaImagen);


    // Convertir a Base64
    return imagen.toString("base64");

}


// ======================================================
// EXPORTAR FUNCIÓN
// ======================================================

module.exports = cargarImagenBase64;