const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const fs = require("fs");

const doc = new jsPDF();

// --- 1. CONFIGURACIÓN DE FECHA ---
const fecha = new Date().toLocaleDateString(); // Obtiene la fecha de hoy

try {
    // --- 2. LOGO ---
    const imageData = fs.readFileSync("./logo.png");
    const base64Image = imageData.toString("base64");
    doc.addImage(base64Image, "PNG", 15, 10, 40, 0); 
} catch (e) {
    console.log("Aviso: Logo no encontrado, continuando...");
}

// --- 3. ENCABEZADO ---
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("UNIVERSIDAD DE COLIMA", 60, 25);

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text(`Fecha de emisión: ${fecha}`, 60, 32); // Fecha dinámica
doc.text("Lugar: Colima, Col., México", 60, 37);

// Línea decorativa verde
doc.setDrawColor(0, 104, 71); 
doc.setLineWidth(1);
doc.line(15, 45, 195, 45); 

// --- 4. TABLA DE DATOS ---
autoTable(doc, {
  startY: 55,
  head: [['CÓDIGO', 'DESCRIPCIÓN', 'ESTATUS']],
  body: [
    ['UCO-001', 'Inscripción Semestral', 'Pagado'],
    ['UCO-002', 'Seguro Facultativo', 'Vigente'],
    ['UCO-003', 'Constancia de Estudios', 'En trámite'],
  ],
  headStyles: { fillColor: [0, 104, 71] }, // Verde UdeC
});

// --- 5. ESPACIO DE FIRMA (Al final del documento) ---
const finalY = doc.lastAutoTable.finalY + 30; // Calcula dónde terminó la tabla y baja 30 unidades

doc.setDrawColor(150); // Color gris para la línea de firma
doc.line(70, finalY, 140, finalY); // Línea centrada
doc.setFontSize(9);
doc.text("Firma de la Autoridad Académica", 105, finalY + 5, { align: "center" });

// --- 6. GUARDAR ---
doc.save("Reporte_Pro_UdeC.pdf");
console.log("------------------------------------------");
console.log("¡LISTO! Tu reporte profesional está listo.");
console.log("------------------------------------------");
