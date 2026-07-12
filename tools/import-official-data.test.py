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


if __name__ == "__main__":
    unittest.main()
