from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("import-official-data.py")
SPEC = importlib.util.spec_from_file_location("import_official_data", MODULE_PATH)
assert SPEC and SPEC.loader
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class FrontendGenerationTests(unittest.TestCase):
    def test_default_zip_uses_latest_official_archive(self) -> None:
        self.assertEqual(
            IMPORTER.INDICADORES_ZIP.name,
            "indicadores-20260628T002121Z-3-001.zip",
        )

    def test_frontend_catalog_contains_only_minimal_operational_rows(self) -> None:
        base = {
            "name": "Indicador operativo",
            "responsible": "Persona Uno",
            "contributors": "Persona Dos",
            "activity": "Actividad",
            "visible": True,
        }
        rows = [
            {**base, "code": "1.0.0.0.1", "classification": "operational"},
            {**base, "code": "1.0.0.0.1-FMT-AAAA", "classification": "template_variant"},
            {**base, "code": "FMT-01-AAAA", "classification": "pending_mapping"},
        ]

        public_rows = IMPORTER.frontend_catalog_rows(rows)

        self.assertEqual([row["code"] for row in public_rows], ["1.0.0.0.1"])
        self.assertEqual(
            set(public_rows[0]),
            {"code", "name", "responsible", "contributors", "activity"},
        )
        generated = IMPORTER.generate_frontend_catalog_file(public_rows, {})
        self.assertNotRegex(generated, r"(?:FMT|TMP)-|pending_mapping|template_variant|private-workbook")

    def test_frontend_templates_keep_only_exact_operational_keys_without_provenance(self) -> None:
        source_template = {
            "groups": [],
            "headerRows": [],
            "columns": [{"key": "valor", "label": "Valor", "type": "number"}],
            "initialRows": [{"valor": ""}],
            "showTotals": True,
            "allowAddRows": True,
            "addRowLabel": "Agregar fila",
            "emptyRow": {"valor": ""},
        }
        templates = {
            "1.0.0.0.1": source_template,
            "1.0.0.0.1-FMT-AAAA": source_template,
            "FMT-01-AAAA": source_template,
        }

        public_templates = IMPORTER.frontend_workbook_templates(
            templates,
            {"1.0.0.0.1": "Indicador operativo"},
        )

        self.assertEqual(list(public_templates), ["1.0.0.0.1"])
        serialized = json.dumps(public_templates)
        self.assertNotRegex(serialized, r"(?:FMT|TMP)-|pending_mapping|private-workbook")
        self.assertEqual(public_templates["1.0.0.0.1"]["sourcePath"], "")

    def test_classification_matrix_is_derived_from_catalog_rows(self) -> None:
        rows = [{
            "code": "4.1.2.2.1",
            "sourceCode": "FMT-01-AAAA",
            "classification": "operational",
            "visible": True,
            "responsible": "Angel Ordoñez",
            "activity": "Fuente oficial.xlsx",
        }]
        stats = {
            "sourceRows": 1,
            "uniqueIndicators": 1,
            "operationalRows": 1,
            "templateRows": 0,
            "templateVariantRows": 0,
            "pendingMappingRows": 0,
        }

        generated = IMPORTER.generate_classification_matrix(rows, stats)

        self.assertIn("4.1.2.2.1", generated)
        self.assertIn("indicadores-20260628T002121Z-3-001.zip", generated)
        self.assertIn("Indicadores operativos visibles y únicos: `1`", generated)


class WorkbookTemplateTests(unittest.TestCase):
    def test_reference_code_is_promoted_only_for_one_described_table(self) -> None:
        sheets = [
            {
                "name": "Hoja2",
                "table": {"columns": [], "initialRows": [], "headerRows": []},
                "_codes": ["4.1.2.2.1"],
                "codeDescriptions": [
                    "4.1.2.2.1. Porcentaje de UO que realizan acciones de actualización"
                ],
            }
        ]

        self.assertEqual(
            IMPORTER.inferred_indicator_code_from_table(sheets),
            "4.1.2.2.1",
        )

    def test_reference_code_without_capture_table_is_not_promoted(self) -> None:
        sheets = [
            {
                "name": "Hoja1",
                "table": None,
                "_codes": ["4.1.5.3.3"],
                "codeDescriptions": ["4.1.5.3.3. Programa anual de comunicación social"],
            }
        ]

        self.assertEqual(IMPORTER.inferred_indicator_code_from_table(sheets), "")

    def test_sheet_with_target_indicator_code_wins_over_larger_sheet(self) -> None:
        small_matching_table = {
            "columns": [{"key": "docentes", "label": "Docentes", "type": "number"}],
            "initialRows": [{"docentes": ""}],
            "headerRows": [],
        }
        large_unrelated_table = {
            "columns": [
                {"key": "plantel", "label": "Plantel", "type": "readonly"},
                {"key": "estudiantes", "label": "Estudiantes", "type": "number"},
            ],
            "initialRows": [
                {"plantel": "Bachillerato 1", "estudiantes": 1},
                {"plantel": "Bachillerato 2", "estudiantes": 2},
            ],
            "headerRows": [],
        }
        sheets = [
            {
                "name": "Hoja1",
                "table": large_unrelated_table,
                "formulaCells": 10,
                "_indicatorCodes": ["1.1.2.2.8"],
                "_codes": ["1.1.2.2.8"],
                "codeDescriptions": [],
                "activityDescriptions": [],
                "headerRows": [],
            },
            {
                "name": "Hoja2",
                "table": small_matching_table,
                "formulaCells": 0,
                "_indicatorCodes": ["1.1.2.5.10"],
                "_codes": ["1.1.2.5.10"],
                "codeDescriptions": [],
                "activityDescriptions": [],
                "headerRows": [],
            },
        ]

        template = IMPORTER.template_from_workbook_sheets(
            "1.1.2.5.10",
            sheets,
            "Indicadores/idiomas.xlsx",
            official_code="1.1.2.5.10",
        )

        self.assertIsNotNone(template)
        self.assertEqual(template["sheetName"], "Hoja2")
        self.assertEqual(template["columns"][0]["label"], "Docentes")

    def test_hiding_blank_readonly_column_preserves_grouped_headers(self) -> None:
        columns = [
            {"key": "delegacion", "label": "Delegación", "type": "readonly"},
            {"key": "plantel", "label": "Plantel", "type": "readonly"},
            {"key": "mujeres", "label": "Mujeres", "type": "number"},
            {"key": "hombres", "label": "Hombres", "type": "number"},
        ]
        rows = [{"delegacion": "", "plantel": "Bachillerato 16", "mujeres": 2, "hombres": 3}]
        header_rows = [
            [
                {"label": "Contexto", "colspan": 2},
                {"label": "Egresados", "colspan": 2},
            ],
            [
                {"label": "Delegación"},
                {"label": "Plantel"},
                {"label": "Mujeres"},
                {"label": "Hombres"},
            ],
        ]

        normalized_columns, normalized_rows, normalized_headers = IMPORTER.normalize_extracted_table(
            columns,
            rows,
            header_rows,
        )

        self.assertEqual([column["key"] for column in normalized_columns], ["plantel", "mujeres", "hombres"])
        self.assertNotIn("delegacion", normalized_rows[0])
        self.assertEqual(
            normalized_headers,
            [
                [{"label": "Contexto"}, {"label": "Egresados", "colspan": 2}],
                [{"label": "Plantel"}, {"label": "Mujeres"}, {"label": "Hombres"}],
            ],
        )

    def test_empty_header_row_does_not_leave_oversized_rowspan(self) -> None:
        headers = [
            [{"label": "Plantel", "rowspan": 3}],
            [{"label": "Seguimiento"}],
            [],
        ]

        self.assertEqual(
            IMPORTER.strip_empty_header_rows(headers),
            [
                [{"label": "Plantel", "rowspan": 2}],
                [{"label": "Seguimiento"}],
            ],
        )

    def test_grouped_header_does_not_overlap_its_subcolumns(self) -> None:
        malformed_headers = [
            [
                {"label": "Plantel", "rowspan": 2},
                {"label": "Programa Educativo", "rowspan": 2},
                {"label": "Egresados", "colspan": 3, "rowspan": 2},
                {"label": "MatrÃ­cula", "colspan": 3, "rowspan": 2},
                {"label": "% titulaciÃ³n", "rowspan": 2},
            ],
            [
                {"label": "Mujeres"},
                {"label": "Hombres"},
                {"label": "Total"},
                {"label": "Mujeres"},
                {"label": "Hombres"},
                {"label": "Total"},
            ],
        ]

        repaired = IMPORTER.repair_header_geometry(malformed_headers, 9)

        self.assertTrue(IMPORTER.header_layout_is_valid(repaired, 9))
        self.assertNotIn("rowspan", repaired[0][2])
        self.assertNotIn("rowspan", repaired[0][3])
        self.assertEqual(repaired[0][0]["rowspan"], 2)
        self.assertEqual(repaired[0][4]["rowspan"], 2)

    @unittest.skipUnless(IMPORTER.INDICADORES_ZIP.exists(), "ZIP oficial no disponible")
    def test_real_language_indicator_uses_sheet_two(self) -> None:
        _, _, _, _, templates = IMPORTER.workbook_summaries()

        self.assertIn("1.1.2.5.10", templates)
        self.assertEqual(templates["1.1.2.5.10"]["sheetName"], "Hoja2")

    @unittest.skipUnless(IMPORTER.INDICADORES_ZIP.exists(), "ZIP oficial no disponible")
    def test_all_real_grouped_headers_fit_their_generated_columns(self) -> None:
        _, _, _, _, templates = IMPORTER.workbook_summaries()
        templates = IMPORTER.canonicalize_workbook_templates(templates)

        invalid_codes = [
            code
            for code, template in templates.items()
            if template.get("headerRows")
            and not IMPORTER.header_layout_is_valid(
                template["headerRows"],
                len(template["columns"]),
            )
        ]

        self.assertEqual(invalid_codes, [])


if __name__ == "__main__":
    unittest.main()
