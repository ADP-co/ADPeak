// Generated from drive-download-20260428T232937Z-3-001.zip.
// Source binaries and personal identifiers are intentionally not committed.

export type OfficialEvidenceGroup = {
  category: string;
  fileCount: number;
  totalBytes: number;
  byExtension: Record<string, number>;
  sampleFileTypes: string[];
};

export type OfficialWorkbookSheetSummary = {
  name: string;
  nonEmptyRows: number;
  columnsObserved: number;
  sampleHeaders: string[];
  numericCells: number;
  textCells: number;
};

export type OfficialWorkbookSummary = {
  id: string;
  sourceLabel: string;
  category: string;
  sizeBytes: number;
  sheets: OfficialWorkbookSheetSummary[];
};

export type OfficialDataSummary = {
  sourcePackage: string;
  plantel: string;
  generatedAt: string;
  topLevelFiles: number;
  nestedFiles: number;
  nestedTotalBytes: number;
  workbookCount: number;
  worksheetCount: number;
  worksheetNonEmptyRows: number;
  privacy: string;
};

export const officialDataSummary: OfficialDataSummary = {
  "sourcePackage": "drive-download-20260428T232937Z-3-001.zip",
  "plantel": "Bachillerato 16",
  "generatedAt": "2026-06-12",
  "topLevelFiles": 3,
  "nestedFiles": 981,
  "nestedTotalBytes": 1102495087,
  "workbookCount": 39,
  "worksheetCount": 53,
  "worksheetNonEmptyRows": 2018,
  "privacy": "Datos personales de archivos fuente no se publican; se cargan conteos, estructura y evidencias agregadas."
};

export const officialEvidenceGroups: OfficialEvidenceGroup[] = [
  {
    "category": "Academias",
    "fileCount": 14,
    "totalBytes": 1661380,
    "byExtension": {
      ".docx": 2,
      ".pdf": 5,
      ".xlsx": 7
    },
    "sampleFileTypes": [
      ".docx",
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Actividades de Desarrollo y Formación Integral",
    "fileCount": 1,
    "totalBytes": 11723,
    "byExtension": {
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Concursos Académicos",
    "fileCount": 8,
    "totalBytes": 971223,
    "byExtension": {
      ".jpeg": 8
    },
    "sampleFileTypes": [
      ".jpeg"
    ]
  },
  {
    "category": "CONSTANCIAS SEMANA DE VINCULACIÓN ACADEMICA",
    "fileCount": 12,
    "totalBytes": 2895597,
    "byExtension": {
      ".pdf": 11,
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Formación Docente y Apoyo Académico",
    "fileCount": 2,
    "totalBytes": 44599,
    "byExtension": {
      ".xlsx": 2
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Horarios",
    "fileCount": 9,
    "totalBytes": 5413591,
    "byExtension": {
      ".pdf": 9
    },
    "sampleFileTypes": [
      ".pdf"
    ]
  },
  {
    "category": "Internacionalización e Interculturalidad",
    "fileCount": 2,
    "totalBytes": 80996,
    "byExtension": {
      ".xlsx": 2
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Mobiliario",
    "fileCount": 1,
    "totalBytes": 18610,
    "byExtension": {
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Nivelación Academica",
    "fileCount": 4,
    "totalBytes": 728563,
    "byExtension": {
      ".pdf": 2,
      ".xlsx": 2
    },
    "sampleFileTypes": [
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Personal del Plantel",
    "fileCount": 2,
    "totalBytes": 198425,
    "byExtension": {
      ".xlsx": 2
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Proceso de Admisión 2025",
    "fileCount": 851,
    "totalBytes": 999803705,
    "byExtension": {
      ".docx": 2,
      ".jfif": 10,
      ".jpeg": 1,
      ".pdf": 837,
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".docx",
      ".jfif",
      ".jpeg",
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Programas Interinstitucionales",
    "fileCount": 22,
    "totalBytes": 4535790,
    "byExtension": {
      ".jfif": 13,
      ".jpg": 3,
      ".pdf": 1,
      ".xlsx": 5
    },
    "sampleFileTypes": [
      ".jfif",
      ".jpg",
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Promoción de la Ciencia",
    "fileCount": 18,
    "totalBytes": 20569024,
    "byExtension": {
      ".docx": 2,
      ".pdf": 9,
      ".xlsx": 7
    },
    "sampleFileTypes": [
      ".docx",
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Seguimiento a Proyectos de Investigación",
    "fileCount": 1,
    "totalBytes": 11709,
    "byExtension": {
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  },
  {
    "category": "Seguimiento Académico del Estudiantado",
    "fileCount": 4,
    "totalBytes": 2703880,
    "byExtension": {
      ".pdf": 1,
      ".xlsx": 3
    },
    "sampleFileTypes": [
      ".pdf",
      ".xlsx"
    ]
  },
  {
    "category": "Sensibilidad en Materia de Género",
    "fileCount": 4,
    "totalBytes": 703150,
    "byExtension": {
      ".jpeg": 3,
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".jpeg",
      ".xlsx"
    ]
  },
  {
    "category": "Titulación",
    "fileCount": 25,
    "totalBytes": 62135445,
    "byExtension": {
      ".pdf": 22,
      ".pptx": 1,
      ".xlsx": 2
    },
    "sampleFileTypes": [
      ".pdf",
      ".pptx",
      ".xlsx"
    ]
  },
  {
    "category": "Viajes de Estudio",
    "fileCount": 1,
    "totalBytes": 7677,
    "byExtension": {
      ".xlsx": 1
    },
    "sampleFileTypes": [
      ".xlsx"
    ]
  }
];

export const officialWorkbookSummaries: OfficialWorkbookSummary[] = [
  {
    "id": "271a7880f479e1be",
    "sourceLabel": "Libro oficial 01 - CONSTANCIAS SEMANA DE VINCULACIÓN ACADEMICA",
    "category": "CONSTANCIAS SEMANA DE VINCULACIÓN ACADEMICA",
    "sizeBytes": 10098,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 12,
        "columnsObserved": 5,
        "sampleHeaders": [
          "NO.",
          "Campo reservado",
          "FACULTAD"
        ],
        "numericCells": 11,
        "textCells": 29
      }
    ]
  },
  {
    "id": "f34f2af893ef7dc5",
    "sourceLabel": "Libro oficial 02 - Mobiliario",
    "category": "Mobiliario",
    "sizeBytes": 18610,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 23,
        "columnsObserved": 11,
        "sampleHeaders": [
          "COORIDINACIÓN GENERAL ADMINISTRATIVA Y FINANCIERA"
        ],
        "numericCells": 19,
        "textCells": 81
      }
    ]
  },
  {
    "id": "988e79f442482aee",
    "sourceLabel": "Libro oficial 03 - Sensibilidad en Materia de Género",
    "category": "Sensibilidad en Materia de Género",
    "sizeBytes": 11063,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 5,
        "columnsObserved": 7,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 4,
        "textCells": 12
      }
    ]
  },
  {
    "id": "34caf6d7379cce9e",
    "sourceLabel": "Libro oficial 04 - Formación Docente y Apoyo Académico",
    "category": "Formación Docente y Apoyo Académico",
    "sizeBytes": 22090,
    "sheets": [
      {
        "name": "DOCENTES",
        "nonEmptyRows": 18,
        "columnsObserved": 25,
        "sampleHeaders": [
          "Coordinación General de Docencia"
        ],
        "numericCells": 0,
        "textCells": 40
      }
    ]
  },
  {
    "id": "d2489f13d05dabb8",
    "sourceLabel": "Libro oficial 05 - Proceso de Admisión 2025",
    "category": "Proceso de Admisión 2025",
    "sizeBytes": 9390,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 2,
        "columnsObserved": 17,
        "sampleHeaders": [
          "PLANTEL",
          "CALLE",
          "No. EXTERIOR - INTERIOR",
          "COLONIA",
          "C. P.",
          "ENTIDAD"
        ],
        "numericCells": 6,
        "textCells": 28
      }
    ]
  },
  {
    "id": "dec6fd3c861a4d61",
    "sourceLabel": "Libro oficial 06 - Programas Interinstitucionales",
    "category": "Programas Interinstitucionales",
    "sizeBytes": 9930,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 6,
        "columnsObserved": 9,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 0,
        "textCells": 14
      }
    ]
  },
  {
    "id": "eb2d5a310b43935c",
    "sourceLabel": "Libro oficial 07 - Programas Interinstitucionales",
    "category": "Programas Interinstitucionales",
    "sizeBytes": 19404,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 43,
        "columnsObserved": 19,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 31,
        "textCells": 163
      }
    ]
  },
  {
    "id": "9945ab777160d6c3",
    "sourceLabel": "Libro oficial 08 - Programas Interinstitucionales",
    "category": "Programas Interinstitucionales",
    "sizeBytes": 10312,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 11,
        "columnsObserved": 9,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 8,
        "textCells": 23
      }
    ]
  },
  {
    "id": "97671b35cee9f75b",
    "sourceLabel": "Libro oficial 09 - Programas Interinstitucionales",
    "category": "Programas Interinstitucionales",
    "sizeBytes": 10482,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 10,
        "columnsObserved": 11,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 0,
        "textCells": 21
      }
    ]
  },
  {
    "id": "b1af4068c39d45ed",
    "sourceLabel": "Libro oficial 10 - Formación Docente y Apoyo Académico",
    "category": "Formación Docente y Apoyo Académico",
    "sizeBytes": 22509,
    "sheets": [
      {
        "name": "PERSONAL DE APOYO",
        "nonEmptyRows": 18,
        "columnsObserved": 22,
        "sampleHeaders": [
          "Coordinación General de Docencia"
        ],
        "numericCells": 0,
        "textCells": 40
      }
    ]
  },
  {
    "id": "9b7297b3ca948220",
    "sourceLabel": "Libro oficial 11 - Seguimiento a Proyectos de Investigación",
    "category": "Seguimiento a Proyectos de Investigación",
    "sizeBytes": 11709,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 4,
        "columnsObserved": 14,
        "sampleHeaders": [
          "DIRECCIÓN DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 0,
        "textCells": 7
      }
    ]
  },
  {
    "id": "14072612cbb98ca0",
    "sourceLabel": "Libro oficial 12 - Viajes de Estudio",
    "category": "Viajes de Estudio",
    "sizeBytes": 7677,
    "sheets": [
      {
        "name": "Table 1",
        "nonEmptyRows": 7,
        "columnsObserved": 6,
        "sampleHeaders": [
          "EDUCACIÓN PERTINENTE Y DE CALIDAD 1.1.3.0.3 Porcentaje de estudiantes de NMS y NS particip"
        ],
        "numericCells": 0,
        "textCells": 16
      }
    ]
  },
  {
    "id": "35071967ee2ba972",
    "sourceLabel": "Libro oficial 13 - Personal del Plantel",
    "category": "Personal del Plantel",
    "sizeBytes": 123252,
    "sheets": [
      {
        "name": "AGOSTO 2025",
        "nonEmptyRows": 24,
        "columnsObserved": 15,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 17,
        "textCells": 121
      },
      {
        "name": "PERSONAL DE APOYO ACADÉMICO",
        "nonEmptyRows": 24,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 17,
        "textCells": 126
      },
      {
        "name": "PERSONAL DOCENTE FEB-AGO 24",
        "nonEmptyRows": 127,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 149,
        "textCells": 528
      },
      {
        "name": "PERSONAL DOCENTE AGO-23_ENE-24",
        "nonEmptyRows": 116,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 140,
        "textCells": 489
      },
      {
        "name": "infrestructura_fisica plantel",
        "nonEmptyRows": 42,
        "columnsObserved": 26,
        "sampleHeaders": [
          "Coordinación General de Docencia"
        ],
        "numericCells": 54,
        "textCells": 80
      }
    ]
  },
  {
    "id": "293650a92c1a2647",
    "sourceLabel": "Libro oficial 14 - Programas Interinstitucionales",
    "category": "Programas Interinstitucionales",
    "sizeBytes": 10037,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 6,
        "columnsObserved": 11,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 0,
        "textCells": 15
      }
    ]
  },
  {
    "id": "e445f828d0a53e1d",
    "sourceLabel": "Libro oficial 15 - Actividades de Desarrollo y Formación Integral",
    "category": "Actividades de Desarrollo y Formación Integral",
    "sizeBytes": 11723,
    "sheets": [
      {
        "name": "Table 1",
        "nonEmptyRows": 6,
        "columnsObserved": 12,
        "sampleHeaders": [
          "1.1.3.0.3 Porcentaje de estudiantes de NMS y NS participantes en las actividades de desarr"
        ],
        "numericCells": 0,
        "textCells": 21
      }
    ]
  },
  {
    "id": "5e6cea7db58c15d9",
    "sourceLabel": "Libro oficial 16 - Seguimiento Académico del Estudiantado",
    "category": "Seguimiento Académico del Estudiantado",
    "sizeBytes": 9682,
    "sheets": [
      {
        "name": "Estrategias para combatir el ab",
        "nonEmptyRows": 8,
        "columnsObserved": 5,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 12,
        "textCells": 13
      }
    ]
  },
  {
    "id": "ca57a6beb9925352",
    "sourceLabel": "Libro oficial 17 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 35672,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 197,
        "columnsObserved": 61,
        "sampleHeaders": [
          "Dirección General de Educación Media Superior REPORTE DE PRACTICAS SEMESTRE FEBRERO- JULIO"
        ],
        "numericCells": 430,
        "textCells": 734
      }
    ]
  },
  {
    "id": "f943a4cad7a49447",
    "sourceLabel": "Libro oficial 18 - Internacionalización e Interculturalidad",
    "category": "Internacionalización e Interculturalidad",
    "sizeBytes": 59099,
    "sheets": [
      {
        "name": "FEBRERO – JULIO 2024",
        "nonEmptyRows": 11,
        "columnsObserved": 6,
        "sampleHeaders": [
          "Cronograma del para la promoción del aprendizaje intercultural, internacional y/o global ("
        ],
        "numericCells": 2,
        "textCells": 23
      },
      {
        "name": "AGOSTO 2024 – ENERO 2025",
        "nonEmptyRows": 14,
        "columnsObserved": 6,
        "sampleHeaders": [
          "Cronograma del para la promoción del aprendizaje intercultural, internacional y/o global ("
        ],
        "numericCells": 1,
        "textCells": 46
      },
      {
        "name": "FEBRERO – JULIO 2025",
        "nonEmptyRows": 13,
        "columnsObserved": 6,
        "sampleHeaders": [
          "Cronograma del para la promoción del aprendizaje intercultural, internacional y/o global ("
        ],
        "numericCells": 2,
        "textCells": 40
      }
    ]
  },
  {
    "id": "2e33f70151a4437b",
    "sourceLabel": "Libro oficial 19 - Internacionalización e Interculturalidad",
    "category": "Internacionalización e Interculturalidad",
    "sizeBytes": 21897,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 18,
        "columnsObserved": 13,
        "sampleHeaders": [
          "Universidad de Colima"
        ],
        "numericCells": 120,
        "textCells": 21
      }
    ]
  },
  {
    "id": "096ac7fd39aa144d",
    "sourceLabel": "Libro oficial 20 - Titulación",
    "category": "Titulación",
    "sizeBytes": 53705,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 13,
        "columnsObserved": 26,
        "sampleHeaders": [
          "Universidad de Colima"
        ],
        "numericCells": 25,
        "textCells": 24
      }
    ]
  },
  {
    "id": "9e635cf9513fa827",
    "sourceLabel": "Libro oficial 21 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 24609,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 5,
        "columnsObserved": 25,
        "sampleHeaders": [
          "Dirección General de Educación Media Superior"
        ],
        "numericCells": 0,
        "textCells": 15
      }
    ]
  },
  {
    "id": "ae019a844c003624",
    "sourceLabel": "Libro oficial 22 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 26104,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 11,
        "columnsObserved": 17,
        "sampleHeaders": [
          "Dirección General de Educación Media Superior"
        ],
        "numericCells": 0,
        "textCells": 22
      }
    ]
  },
  {
    "id": "f7c07838394c06bc",
    "sourceLabel": "Libro oficial 23 - Nivelación Academica",
    "category": "Nivelación Academica",
    "sizeBytes": 91306,
    "sheets": [
      {
        "name": "ORDINARIO",
        "nonEmptyRows": 15,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 49
      },
      {
        "name": "EXTRAORDINARIO",
        "nonEmptyRows": 15,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 49
      },
      {
        "name": "REGULARIZACIÓN",
        "nonEmptyRows": 15,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 49
      }
    ]
  },
  {
    "id": "19b732820ab97b65",
    "sourceLabel": "Libro oficial 24 - Seguimiento Académico del Estudiantado",
    "category": "Seguimiento Académico del Estudiantado",
    "sizeBytes": 175712,
    "sheets": [
      {
        "name": "REPORTE ENERO 2025",
        "nonEmptyRows": 14,
        "columnsObserved": 48,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 64,
        "textCells": 67
      },
      {
        "name": "REPORTE JULIO- AGOSTO 2025",
        "nonEmptyRows": 14,
        "columnsObserved": 48,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 132,
        "textCells": 67
      }
    ]
  },
  {
    "id": "1500e4e568fbe88b",
    "sourceLabel": "Libro oficial 25 - Seguimiento Académico del Estudiantado",
    "category": "Seguimiento Académico del Estudiantado",
    "sizeBytes": 11213,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 11,
        "columnsObserved": 22,
        "sampleHeaders": [
          "DIRECCIÓN GENERAL DE EDUCACIÓN MEDIA SUPERIOR"
        ],
        "numericCells": 10,
        "textCells": 28
      }
    ]
  },
  {
    "id": "7d333e2294bfaa56",
    "sourceLabel": "Libro oficial 26 - Nivelación Academica",
    "category": "Nivelación Academica",
    "sizeBytes": 91554,
    "sheets": [
      {
        "name": "ORDINARIO",
        "nonEmptyRows": 16,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 50
      },
      {
        "name": "EXTRAORDINARIO",
        "nonEmptyRows": 15,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 49
      },
      {
        "name": "REGULARIZACIÓN",
        "nonEmptyRows": 15,
        "columnsObserved": 31,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 60,
        "textCells": 49
      }
    ]
  },
  {
    "id": "84df6e2c1148365c",
    "sourceLabel": "Libro oficial 27 - Titulación",
    "category": "Titulación",
    "sizeBytes": 14930,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 92,
        "columnsObserved": 14,
        "sampleHeaders": [
          "BACHILLERATO 16"
        ],
        "numericCells": 169,
        "textCells": 282
      }
    ]
  },
  {
    "id": "4ba02a67b08d040f",
    "sourceLabel": "Libro oficial 28 - Personal del Plantel",
    "category": "Personal del Plantel",
    "sizeBytes": 75173,
    "sheets": [
      {
        "name": "PERSONAL DE APOYO ACADÉMICO",
        "nonEmptyRows": 26,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 18,
        "textCells": 129
      },
      {
        "name": "PERSONAL DOCENTE_2026",
        "nonEmptyRows": 42,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 34,
        "textCells": 62
      }
    ]
  },
  {
    "id": "e871fdb342215b8f",
    "sourceLabel": "Libro oficial 29 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 34861,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 176,
        "columnsObserved": 61,
        "sampleHeaders": [],
        "numericCells": 685,
        "textCells": 1295
      }
    ]
  },
  {
    "id": "c8632b122b777164",
    "sourceLabel": "Libro oficial 30 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 34858,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 156,
        "columnsObserved": 61,
        "sampleHeaders": [
          "Dirección General de Educación Media Superior REPORTE DE PRACTICAS SEMESTRE FEBRERO- AGOST"
        ],
        "numericCells": 656,
        "textCells": 1414
      }
    ]
  },
  {
    "id": "ed02904eadf5410a",
    "sourceLabel": "Libro oficial 31 - Academias",
    "category": "Academias",
    "sizeBytes": 13869,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 61,
        "columnsObserved": 8,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 72,
        "textCells": 173
      }
    ]
  },
  {
    "id": "96d3d8b823f8ed9b",
    "sourceLabel": "Libro oficial 32 - Academias",
    "category": "Academias",
    "sizeBytes": 13293,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 50,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 49,
        "textCells": 139
      }
    ]
  },
  {
    "id": "3f0f30f78db6f263",
    "sourceLabel": "Libro oficial 33 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 34842,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 175,
        "columnsObserved": 61,
        "sampleHeaders": [
          "no y me levante"
        ],
        "numericCells": 654,
        "textCells": 1416
      }
    ]
  },
  {
    "id": "6e1027fd747605fe",
    "sourceLabel": "Libro oficial 34 - Academias",
    "category": "Academias",
    "sizeBytes": 54555,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 38,
        "columnsObserved": 26,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 26,
        "textCells": 104
      }
    ]
  },
  {
    "id": "501429d2657bf1fa",
    "sourceLabel": "Libro oficial 35 - Academias",
    "category": "Academias",
    "sizeBytes": 10548,
    "sheets": [
      {
        "name": "5, 3 y 1 semestre",
        "nonEmptyRows": 42,
        "columnsObserved": 8,
        "sampleHeaders": [
          "Universidad de Colima"
        ],
        "numericCells": 9,
        "textCells": 81
      }
    ]
  },
  {
    "id": "0004449829408fc0",
    "sourceLabel": "Libro oficial 36 - Promoción de la Ciencia",
    "category": "Promoción de la Ciencia",
    "sizeBytes": 33166,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 174,
        "columnsObserved": 61,
        "sampleHeaders": [
          "Dirección General de Educación Media Superior REPORTE DE PRACTICAS SEMESTRE AGOSTO 2024 - "
        ],
        "numericCells": 575,
        "textCells": 1297
      }
    ]
  },
  {
    "id": "27c6ab91c92ed5bd",
    "sourceLabel": "Libro oficial 37 - Academias",
    "category": "Academias",
    "sizeBytes": 9095,
    "sheets": [
      {
        "name": "Hoja1",
        "nonEmptyRows": 6,
        "columnsObserved": 5,
        "sampleHeaders": [
          "Relación de docentes en el campo disciplinar de Idiomas"
        ],
        "numericCells": 8,
        "textCells": 18
      }
    ]
  },
  {
    "id": "ca7c367b955a8ac9",
    "sourceLabel": "Libro oficial 38 - Academias",
    "category": "Academias",
    "sizeBytes": 33506,
    "sheets": [
      {
        "name": "INFORME SEMESTRAL AGOSTO",
        "nonEmptyRows": 25,
        "columnsObserved": 12,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 18,
        "textCells": 41
      },
      {
        "name": "INFORME SEMESTRAL FEBRERO",
        "nonEmptyRows": 26,
        "columnsObserved": 12,
        "sampleHeaders": [
          "UNIVERSIDAD DE COLIMA"
        ],
        "numericCells": 17,
        "textCells": 51
      },
      {
        "name": "0",
        "nonEmptyRows": 0,
        "columnsObserved": 0,
        "sampleHeaders": [],
        "numericCells": 0,
        "textCells": 0
      }
    ]
  },
  {
    "id": "ccf537b66339ebab",
    "sourceLabel": "Libro oficial 39 - Academias",
    "category": "Academias",
    "sizeBytes": 193530,
    "sheets": [
      {
        "name": "Registro Manuales",
        "nonEmptyRows": 5,
        "columnsObserved": 82,
        "sampleHeaders": [
          "Universidad de Colima"
        ],
        "numericCells": 3,
        "textCells": 26
      }
    ]
  }
];
