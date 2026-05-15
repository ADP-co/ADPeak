// ======================================================
// TABLA DINÁMICA DEL REPORTE
// ------------------------------------------------------
// Este módulo se encarga de generar la tabla
// usando datos dinámicos del reporte.
//
// Responsabilidad:
// - columnas
// - filas
// - estilos básicos
// ======================================================


// Importamos la librería de tablas
const autoTable = require("jspdf-autotable").default;


// Función principal de la tabla
function dibujarTabla(doc, reporte) {

    // ==================================================
    // GENERACIÓN DE TABLA DINÁMICA
    // ==================================================

    autoTable(doc, {

        head: [reporte.columnas], // columnas dinámicas

        body: reporte.datos, // filas dinámicas

        startY: 70, // posición debajo del encabezado

        styles: {
            fontSize: 10
        },

        headStyles: {
            fillColor: [0, 90, 70] // verde institucional UdeC
        }

    });

}


// Exportamos el módulo
module.exports = dibujarTabla;