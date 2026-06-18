from __future__ import annotations

import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"C:\Users\Lenovo\Downloads\drive-download-20260428T232937Z-3-001")
SOURCE_ZIP = SOURCE_DIR.with_suffix(".zip")
CATALOG_XLSX = SOURCE_DIR / "Libro1.xlsx"
NESTED_ZIP = SOURCE_DIR / "Bachillerato 16-20260424T001029Z-3-001.zip"

BACKEND_CATALOG_TARGET = REPO_ROOT / "apps/backend/src/official-catalog.generated.ts"
FRONTEND_CATALOG_TARGET = REPO_ROOT / "apps/frontend/src/catalog/officialCatalog.generated.ts"
BACKEND_DATA_TARGET = REPO_ROOT / "apps/backend/src/official-data.generated.ts"
FRONTEND_DATA_TARGET = REPO_ROOT / "apps/frontend/src/catalog/officialData.generated.ts"

CODE_RE = re.compile(r"\b\d+(?:\.\d+){3,}\b")
PLANTEL_RE = re.compile(r"\bBACH(?:ILLERATO)?\s*\.?\s*(\d+)\b|\bBachillerato\s+(\d+)\b", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", re.I)
CONTACT_RE = re.compile(r"\b(?:ext\.?|extension|tel(?:efono)?\.?|celular|correo)\b", re.I)
MOJIBAKE_MARKERS = ("\u00c3", "\u00c2", "\u00e2", "\ufffd")
HEADER_TOKENS = {
    "accion",
    "actividad",
    "alumno",
    "avance",
    "bachillerato",
    "cantidad",
    "competencia",
    "correo",
    "descripcion",
    "docente",
    "evidencia",
    "grupo",
    "hombre",
    "indicador",
    "matricula",
    "meta",
    "modalidad",
    "mujer",
    "nombre",
    "observacion",
    "periodo",
    "plantel",
    "programa",
    "responsable",
    "seguimiento",
    "semestre",
    "total",
}

READONLY_TOKENS = {
    "actividad",
    "delegacion",
    "plantel",
    "programa",
    "semestre",
    "turno",
}

NUMBER_TOKENS = {
    "alumna",
    "alumno",
    "avance",
    "cantidad",
    "hombre",
    "meta",
    "mujer",
    "numero",
    "participante",
    "porcentaje",
    "total",
}

PRIVATE_TOKENS = {
    "correo",
    "curp",
    "cuenta",
    "director",
    "email",
    "extension",
    "nombre",
    "profesor",
    "responsable",
    "telefono",
    "trabajador",
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ").strip()
    text = " ".join(text.split())
    return unicodedata.normalize("NFC", text)


def normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def json_ts(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def write_text(path: Path, text: str) -> None:
    if any(marker in text for marker in MOJIBAKE_MARKERS):
        raise RuntimeError(f"Refusing to write mojibake into {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def catalog_rows() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    workbook = load_workbook(CATALOG_XLSX, data_only=True, read_only=True)
    sheet = workbook["Reporte Final"]
    seen: dict[str, int] = {}
    rows: list[dict[str, Any]] = []

    for index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        code, name, responsible, contributors, activity = [clean_text(cell) for cell in row[:5]]
        if not any((code, name, responsible, contributors, activity)):
            continue
        dedupe_key = "\u241f".join((code, name, responsible, contributors, activity))
        duplicate_of = seen.get(dedupe_key)
        if duplicate_of is None:
            seen[dedupe_key] = index

        rows.append(
            {
                "sourceRow": index,
                "code": code,
                "name": name,
                "responsible": responsible,
                "contributors": contributors,
                "activity": activity,
                "dedupeKey": hashlib.sha256(dedupe_key.encode("utf-8")).hexdigest()[:16],
                "isDuplicate": duplicate_of is not None,
                "duplicateOfSourceRow": duplicate_of,
                "dataQuality": [] if activity else ["blank_activity"],
            }
        )

    contributors = sorted(
        {
            person.strip()
            for row in rows
            for person in row["contributors"].split(",")
            if person.strip()
        },
        key=lambda item: item.casefold(),
    )
    stats = {
        "sourceRows": len(rows),
        "uniqueRows": len({row["dedupeKey"] for row in rows}),
        "duplicateRows": sum(1 for row in rows if row["isDuplicate"]),
        "uniqueIndicators": len({row["code"] for row in rows if row["code"]}),
        "uniqueResponsibles": len({row["responsible"] for row in rows if row["responsible"]}),
        "uniqueContributors": len(contributors),
        "uniqueActivities": len({row["activity"] for row in rows if row["activity"]}),
        "blankActivities": sum(1 for row in rows if not row["activity"]),
    }
    return rows, stats


def extend_rows_with_workbook_indicators(
    rows: list[dict[str, Any]],
    workbook_templates: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    existing_codes = {row["code"] for row in rows if row["code"]}
    existing_rows_by_code: dict[str, dict[str, Any]] = {}
    for row in rows:
        if row["code"] and row["code"] not in existing_rows_by_code:
            existing_rows_by_code[row["code"]] = row
    next_source_row = max((row["sourceRow"] for row in rows), default=1) + 1
    extended = list(rows)

    for code, template in sorted(workbook_templates.items(), key=lambda item: normalize_key(item[0])):
        if code in existing_codes:
            continue

        original_code = clean_text(template.get("officialCode"))
        original_row = existing_rows_by_code.get(original_code)
        name = clean_text(template.get("indicatorName")) or f"Indicador oficial {code}"
        activity = clean_text(template.get("sourceLabel")) or "Actividad oficial importada"
        responsible = original_row["responsible"] if original_row else "Pendiente de asignar"
        contributors = original_row["contributors"] if original_row else "Planteles"
        data_quality = list(template.get("quality") or [])
        if original_code and original_code != code:
            data_quality.append("shared_official_code_split_by_source")
        if not original_code:
            data_quality.append("pending_indicator_code")
        dedupe_key = "\u241f".join((code, name, responsible, contributors, activity))
        extended.append(
            {
                "sourceRow": next_source_row,
                "code": code,
                "name": name,
                "responsible": responsible,
                "contributors": contributors,
                "activity": activity,
                "dedupeKey": hashlib.sha256(dedupe_key.encode("utf-8")).hexdigest()[:16],
                "isDuplicate": False,
                "duplicateOfSourceRow": None,
                "dataQuality": sorted(set(data_quality + ["workbook_only_indicator"])),
            }
        )
        next_source_row += 1

    return extended


def catalog_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    contributors = sorted(
        {
            person.strip()
            for row in rows
            for person in row["contributors"].split(",")
            if person.strip()
        },
        key=lambda item: item.casefold(),
    )

    return {
        "sourceRows": len(rows),
        "uniqueRows": len({row["dedupeKey"] for row in rows}),
        "duplicateRows": sum(1 for row in rows if row["isDuplicate"]),
        "uniqueIndicators": len({row["code"] for row in rows if row["code"]}),
        "uniqueResponsibles": len({row["responsible"] for row in rows if row["responsible"]}),
        "uniqueContributors": len(contributors),
        "uniqueActivities": len({row["activity"] for row in rows if row["activity"]}),
        "blankActivities": sum(1 for row in rows if not row["activity"]),
        "workbookOnlyIndicators": sum(1 for row in rows if "workbook_only_indicator" in row["dataQuality"]),
    }


def frontend_catalog_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    aliases = person_aliases(rows)
    sanitized = []

    for row in rows:
        next_row = dict(row)
        next_row["responsible"] = aliases.get(row["responsible"], "Responsable sin asignar")
        next_row["contributors"] = ", ".join(
            aliases.get(person, "Responsable sin asignar")
            for person in split_people(row["contributors"])
        )
        sanitized.append(next_row)

    return sanitized


def person_aliases(rows: list[dict[str, Any]]) -> dict[str, str]:
    people = sorted(
        {
            person
            for row in rows
            for person in [row["responsible"], *split_people(row["contributors"])]
            if person
        },
        key=lambda value: normalize_key(value),
    )
    return {person: f"Responsable {index:02d}" for index, person in enumerate(people, start=1)}


def split_people(value: str) -> list[str]:
    return [clean_text(part) for part in value.split(",") if clean_text(part)]


def catalog_plantel_scopes(rows: list[dict[str, Any]], detected_scopes: dict[str, list[int]]) -> dict[str, list[int]]:
    catalog_codes = {row["code"] for row in rows if row["code"]}
    scopes: dict[str, set[int]] = {}

    for code, plantel_ids in detected_scopes.items():
        if code in catalog_codes:
            scopes.setdefault(code, set()).update(plantel_ids)

    return {
        code: sorted(plantel_ids)
        for code, plantel_ids in sorted(scopes.items(), key=lambda item: normalize_key(item[0]))
    }


def workbook_summaries() -> tuple[
    list[dict[str, Any]],
    dict[str, list[int]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    dict[str, dict[str, Any]],
]:
    summaries: list[dict[str, Any]] = []
    evidence_groups: dict[str, dict[str, Any]] = {}
    scopes: dict[str, set[int]] = defaultdict(set)
    template_candidates: list[dict[str, Any]] = []
    workbook_templates: dict[str, dict[str, Any]] = {}

    if not NESTED_ZIP.exists():
        return summaries, {}, [], [], {}

    with zipfile.ZipFile(NESTED_ZIP) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        for info in infos:
            category = category_from_path(info.filename)
            group = evidence_groups.setdefault(
                category,
                {"category": category, "fileCount": 0, "totalBytes": 0, "byExtension": Counter()},
            )
            group["fileCount"] += 1
            group["totalBytes"] += info.file_size
            group["byExtension"][Path(info.filename).suffix.lower() or "<none>"] += 1

        for info in infos:
            if Path(info.filename).suffix.lower() != ".xlsx":
                continue
            payload = archive.read(info)
            digest = hashlib.sha256(payload).hexdigest()
            workbook = load_workbook(io.BytesIO(payload), data_only=False, read_only=True)
            codes: set[str] = set()
            planteles: set[str] = set()
            sheets = []
            formulas = 0

            for sheet in workbook.worksheets:
                sheet_summary = summarize_sheet(sheet)
                codes.update(sheet_summary.pop("codes"))
                planteles.update(sheet_summary.pop("planteles"))
                formulas += sheet_summary["formulaCells"]
                sheets.append(sheet_summary)

            if not planteles:
                planteles.add("Bachillerato 16")
            table_sheets = [sheet for sheet in sheets if sheet.get("table")]
            source_codes = sorted(codes, key=normalize_key)
            template_codes = source_codes or (
                [synthetic_workbook_code(info.filename, digest)] if table_sheets else []
            )

            for source_index, source_code in enumerate(template_codes, start=1):
                original_code = source_code if source_code in source_codes else ""
                template_code = source_code
                if template_code in workbook_templates:
                    template_code = synthetic_workbook_code(info.filename, digest, original_code or source_code, source_index)

                if "Bachillerato 16" in planteles:
                    scopes[template_code].add(1)
                template_candidates.append(
                    {
                        "indicatorCode": template_code,
                        "officialCode": original_code or None,
                        "sourcePath": unicodedata.normalize("NFC", info.filename),
                        "planteles": sorted(planteles, key=str.casefold),
                        "classification": classify_workbook(sheets),
                        "confidence": "detected-code" if original_code else "source-table-pending-code",
                        "headerRows": first_header_rows(sheets),
                    }
                )
                table_template = template_from_workbook_sheets(
                    template_code,
                    sheets,
                    info.filename,
                    official_code=original_code,
                    source_index=source_index,
                )
                if table_template and template_code not in workbook_templates:
                    workbook_templates[template_code] = table_template

            summaries.append(
                {
                    "id": digest[:16],
                    "sourceLabel": unicodedata.normalize("NFC", Path(info.filename).name),
                    "sourcePathHash": digest,
                    "category": category_from_path(info.filename),
                    "sizeBytes": info.file_size,
                    "detectedIndicatorCodes": sorted(codes),
                    "detectedPlanteles": sorted(planteles, key=str.casefold),
                    "formulaCells": formulas,
                    "sheets": sheets,
                    "privacy": "Row-level personal data remains in private storage only.",
                }
            )

    groups = []
    for value in evidence_groups.values():
        by_ext = dict(sorted(value["byExtension"].items()))
        groups.append(
            {
                "category": value["category"],
                "fileCount": value["fileCount"],
                "totalBytes": value["totalBytes"],
                "byExtension": by_ext,
                "sampleFileTypes": sorted(by_ext)[:6],
            }
        )

    return (
        summaries,
        {code: sorted(ids) for code, ids in scopes.items()},
        sorted(groups, key=lambda item: item["category"].casefold()),
        template_candidates,
        workbook_templates,
    )


def summarize_sheet(sheet: Any) -> dict[str, Any]:
    codes: set[str] = set()
    planteles: set[str] = set()
    rows_seen = 0
    numeric_cells = 0
    text_cells = 0
    formula_cells = 0
    header_rows: list[list[str]] = []
    non_empty_rows: list[dict[str, Any]] = []
    code_descriptions: list[str] = []
    columns_observed = 0

    max_row = min(sheet.max_row or 80, 120)
    max_col = min(sheet.max_column or 30, 30)

    for row_number, row in enumerate(sheet.iter_rows(min_row=1, max_row=max_row, max_col=max_col, values_only=False), start=1):
        values = [clean_text(cell.value) for cell in row]
        non_empty = [value for value in values if value]
        if not non_empty:
            continue
        rows_seen += 1
        for column_index, value in enumerate(values, start=1):
            if value:
                columns_observed = max(columns_observed, column_index)
        row_text = " ".join(non_empty)
        non_empty_rows.append({"row": row_number, "values": trim_trailing_blanks(values)})
        row_codes = CODE_RE.findall(row_text)
        codes.update(row_codes)
        if row_codes and len(code_descriptions) < 5:
            code_descriptions.append(row_text)
        for match in PLANTEL_RE.finditer(row_text):
            number = match.group(1) or match.group(2)
            if number:
                planteles.add(f"Bachillerato {int(number)}")

        for cell in row:
            if isinstance(cell.value, str) and cell.value.startswith("="):
                formula_cells += 1
            elif isinstance(cell.value, (int, float)):
                numeric_cells += 1
            elif cell.value is not None:
                text_cells += 1

        candidate = sanitize_header_row(non_empty)
        if candidate and len(header_rows) < 6:
            header_rows.append(candidate)

    return {
        "name": clean_text(sheet.title),
        "nonEmptyRows": rows_seen,
        "columnsObserved": columns_observed,
        "sampleHeaders": header_rows[0] if header_rows else [],
        "headerRows": header_rows,
        "numericCells": numeric_cells,
        "textCells": text_cells,
        "formulaCells": formula_cells,
        "table": extract_table_from_rows(non_empty_rows),
        "codeDescriptions": code_descriptions,
        "codes": codes,
        "planteles": planteles,
    }


def trim_trailing_blanks(values: list[str]) -> list[str]:
    trimmed = list(values)
    while trimmed and not trimmed[-1]:
        trimmed.pop()
    return trimmed


def extract_table_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not rows:
        return None

    best_index = -1
    best_score = 0
    for index, row in enumerate(rows):
        values = row["values"]
        normalized = " ".join(normalize_key(value) for value in values if value)
        token_score = sum(1 for token in HEADER_TOKENS if token in normalized)
        width_score = min(4, len([value for value in values if value]))
        score = token_score * 3 + width_score
        if score > best_score and token_score >= 1 and width_score >= 2:
            best_index = index
            best_score = score

    if best_index < 0:
        return None

    header_values = rows[best_index]["values"]
    width = len(header_values)
    columns = []
    seen_keys: set[str] = set()
    for index, label in enumerate(header_values):
        if not label:
            label = f"Columna {index + 1}"
        columns.append(column_from_label(label, seen_keys))

    initial_rows = []
    for row in rows[best_index + 1:]:
        values = row["values"][:width]
        if not any(values):
            continue
        normalized = normalize_key(" ".join(values))
        if "nota" in normalized and len(values) <= 2:
            continue

        row_object: dict[str, Any] = {}
        for column, value in zip(columns, values + [""] * (width - len(values))):
            row_object[column["key"]] = value_for_column(column, value)
        if any(value not in ("", None) for value in row_object.values()):
            initial_rows.append(row_object)
        if len(initial_rows) >= 60:
            break

    if not initial_rows:
        initial_rows = [{column["key"]: "" for column in columns}]

    return {
        "headerRow": rows[best_index]["row"],
        "columns": columns,
        "initialRows": initial_rows,
    }


def column_from_label(label: str, seen_keys: set[str]) -> dict[str, Any]:
    normalized = normalize_key(label)
    key = normalized.replace(" ", "_")[:48] or "columna"
    counter = 2
    base_key = key
    while key in seen_keys:
        key = f"{base_key}_{counter}"
        counter += 1
    seen_keys.add(key)

    if any(token in normalized for token in READONLY_TOKENS):
        column_type = "readonly"
    elif any(token in normalized for token in NUMBER_TOKENS):
        column_type = "number"
    else:
        column_type = "text"

    return {
        "key": key,
        "label": label,
        "type": column_type,
        "private": any(token in normalized for token in PRIVATE_TOKENS),
    }


def value_for_column(column: dict[str, Any], value: str) -> Any:
    if column.get("private"):
        return ""

    if is_private_cell_value(value):
        return ""

    if column["type"] == "number":
        normalized = value.replace(",", "").replace("%", "").strip()
        try:
            return float(normalized) if normalized else ""
        except ValueError:
            return ""

    return value


def is_private_cell_value(value: str) -> bool:
    return bool(EMAIL_RE.search(value) or CONTACT_RE.search(value))


def sanitize_header_row(values: list[str]) -> list[str]:
    labels = []
    for value in values:
        normalized = normalize_key(value)
        if "@" in value or len(value) > 140:
            continue
        if any(token in normalized.split() or token in normalized for token in HEADER_TOKENS):
            labels.append(value)
    if len(labels) >= 2:
        return labels[:14]
    return []


def first_header_rows(sheets: list[dict[str, Any]]) -> list[list[str]]:
    for sheet in sheets:
        header_rows = sheet.get("headerRows") or []
        if header_rows:
            return header_rows[:3]
    return []


def frontend_workbook_summaries(summaries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized = []

    for workbook_index, summary in enumerate(summaries, start=1):
        next_summary = dict(summary)
        next_summary["sourceLabel"] = f"{summary['category']} / workbook {workbook_index:02d}"
        next_summary["privacy"] = "Frontend fallback exposes aggregate workbook structure only."
        next_summary["sheets"] = [
            {
                **sheet,
                "name": f"Sheet {sheet_index:02d}",
                "sampleHeaders": [],
                "headerRows": [],
            }
            for sheet_index, sheet in enumerate(summary["sheets"], start=1)
        ]
        sanitized.append(next_summary)

    return sanitized


def frontend_template_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            **candidate,
            "sourcePath": f"private-workbook-{index:02d}",
            "headerRows": [],
        }
        for index, candidate in enumerate(candidates, start=1)
    ]


def synthetic_workbook_code(
    source_path: str,
    digest: str,
    official_code: str = "",
    source_index: int = 1,
) -> str:
    stem = normalize_key(Path(source_path).stem).replace(" ", "-")[:24].strip("-")
    suffix = digest[:8].upper()
    if official_code:
        return f"{official_code}-FMT-{suffix}"
    return f"B16-FMT-{source_index:02d}-{suffix}-{stem or 'oficial'}"


def template_from_workbook_sheets(
    code: str,
    sheets: list[dict[str, Any]],
    source_path: str,
    *,
    official_code: str = "",
    source_index: int = 1,
) -> dict[str, Any] | None:
    table_sheets = [sheet for sheet in sheets if sheet.get("table")]
    if not table_sheets:
        return None

    selected = max(
        table_sheets,
        key=lambda sheet: (
            len(sheet["table"]["initialRows"]),
            len(sheet["table"]["columns"]),
            sheet.get("formulaCells", 0),
        ),
    )
    table = selected["table"]
    columns = [
        {key: value for key, value in column.items() if key != "private"}
        for column in table["columns"]
    ]
    source_label = unicodedata.normalize("NFC", Path(source_path).name)

    return {
        "indicatorCode": code,
        "officialCode": official_code or None,
        "indicatorName": indicator_name_from_sources(official_code or code, sheets, source_label),
        "sourceLabel": source_label,
        "sourcePath": unicodedata.normalize("NFC", source_path),
        "sheetName": selected["name"],
        "groups": [
            {
                "label": "Formato oficial importado",
                "colspan": max(len(columns), 1),
            }
        ],
        "columns": columns,
        "initialRows": table["initialRows"],
        "showTotals": any(column["type"] == "number" for column in columns),
        "allowAddRows": True,
        "addRowLabel": "Agregar fila",
        "emptyRow": empty_row_for_columns(columns),
        "footerNote": "Plantilla generada desde el archivo oficial. Los campos personales se dejan en blanco para captura segura.",
        "quality": [
            value
            for value in [
                "source_workbook_template",
                "private_fields_blank",
                "pending_indicator_code" if not official_code else "official_code_detected",
                "shared_official_code_split_by_source" if official_code and official_code != code else "",
            ]
            if value
        ],
    }


def indicator_name_from_sources(code: str, sheets: list[dict[str, Any]], fallback: str) -> str:
    for sheet in sheets:
        for description in sheet.get("codeDescriptions", []):
            if code not in description:
                continue
            cleaned = re.sub(r"(?i)^.*indicador\s*:?\s*", "", description).strip()
            cleaned = cleaned.replace(code, "").strip(" .:-")
            if cleaned:
                return cleaned[:180]

    return re.sub(r"\.xlsx$", "", fallback, flags=re.I)


def empty_row_for_columns(columns: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        column["key"]: ""
        for column in columns
    }


def frontend_workbook_templates(templates: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    sanitized: dict[str, dict[str, Any]] = {}
    for code, template in templates.items():
        next_template = dict(template)
        next_template["sourcePath"] = "private-workbook"
        next_template["sourceLabel"] = f"Formato oficial {code}"
        sanitized[code] = next_template
    return sanitized


def classify_workbook(sheets: list[dict[str, Any]]) -> str:
    text = normalize_key(" ".join(" ".join(row) for sheet in sheets for row in sheet.get("headerRows", [])))
    if "mujer" in text and "hombre" in text and "total" in text:
        return "matrix_gender_totals"
    if "meta" in text and "avance" in text:
        return "tracking_meta_progress"
    if "correo" in text or "telefono" in text:
        return "private_roster"
    return "official_table"


def category_from_path(filename: str) -> str:
    parts = [part for part in unicodedata.normalize("NFC", filename).split("/") if part]
    if len(parts) >= 3:
        return parts[2]
    if len(parts) >= 2:
        return parts[1]
    return "General"


def generate_catalog_file(rows: list[dict[str, Any]], stats: dict[str, Any], scopes: dict[str, list[int]]) -> str:
    return f"""// Generated by tools/import-official-data.py from Libro1.xlsx.
// Source binaries and row-level private data are intentionally not committed.

export type OfficialCatalogRow = {{
  sourceRow: number;
  code: string;
  name: string;
  responsible: string;
  contributors: string;
  activity: string;
  dedupeKey: string;
  isDuplicate: boolean;
  duplicateOfSourceRow: number | null;
  dataQuality: string[];
}};

export const officialCatalogStats = {json_ts(stats)} as const;

export const officialIndicatorPlantelScopes: Record<string, number[]> = {json_ts(scopes)};

export const officialCatalogRows: OfficialCatalogRow[] = {json_ts(rows)};
"""


def generate_data_file(
    summaries: list[dict[str, Any]],
    evidence_groups: list[dict[str, Any]],
    template_candidates: list[dict[str, Any]],
    workbook_templates: dict[str, dict[str, Any]],
    *,
    frontend: bool = False,
) -> str:
    worksheet_count = sum(len(summary["sheets"]) for summary in summaries)
    row_count = sum(sheet["nonEmptyRows"] for summary in summaries for sheet in summary["sheets"])
    nested_file_count = sum(group["fileCount"] for group in evidence_groups)
    nested_total_bytes = sum(group["totalBytes"] for group in evidence_groups)
    summary = {
        "sourcePackage": SOURCE_ZIP.name,
        "plantel": "Bachillerato 16",
        "generatedAt": "2026-06-17",
        "topLevelFiles": 3,
        "nestedFiles": nested_file_count,
        "nestedTotalBytes": nested_total_bytes,
        "workbookCount": len(summaries),
        "worksheetCount": worksheet_count,
        "worksheetNonEmptyRows": row_count,
        "privacy": "Frontend fallback contains aggregate structure only; full source labels and row-level personal data are backend-private."
        if frontend
        else "Row-level personal data and evidence files remain backend-private; source binaries are not committed.",
    }
    return f"""// Generated by tools/import-official-data.py from drive-download-20260428T232937Z-3-001.zip.
// Source binaries and personal identifiers are intentionally not committed.

export type OfficialEvidenceGroup = {{
  category: string;
  fileCount: number;
  totalBytes: number;
  byExtension: Record<string, number>;
  sampleFileTypes: string[];
}};

export type OfficialWorkbookSheetSummary = {{
  name: string;
  nonEmptyRows: number;
  columnsObserved: number;
  sampleHeaders: string[];
  headerRows: string[][];
  numericCells: number;
  textCells: number;
  formulaCells: number;
  table?: {{
    headerRow: number;
    columns: Array<{{
      key: string;
      label: string;
      type: "readonly" | "number" | "text";
      private?: boolean;
    }}>;
    initialRows: Array<Record<string, unknown>>;
  }} | null;
  codeDescriptions: string[];
}};

export type OfficialWorkbookSummary = {{
  id: string;
  sourceLabel: string;
  sourcePathHash: string;
  category: string;
  sizeBytes: number;
  detectedIndicatorCodes: string[];
  detectedPlanteles: string[];
  formulaCells: number;
  sheets: OfficialWorkbookSheetSummary[];
  privacy: string;
}};

export type OfficialTemplateCandidate = {{
  indicatorCode: string;
  officialCode?: string | null;
  sourcePath: string;
  planteles: string[];
  classification: string;
  confidence: string;
  headerRows: string[][];
}};

export type OfficialWorkbookTemplate = {{
  indicatorCode: string;
  officialCode?: string | null;
  indicatorName: string;
  sourceLabel: string;
  sourcePath: string;
  sheetName: string;
  groups: Array<{{ label: string; colspan: number }}>;
  columns: Array<{{
    key: string;
    label: string;
    type: "readonly" | "number" | "text";
  }}>;
  initialRows: Array<Record<string, unknown>>;
  showTotals: boolean;
  allowAddRows: boolean;
  addRowLabel: string;
  emptyRow: Record<string, unknown>;
  footerNote: string;
  quality: string[];
}};

export type OfficialDataSummary = {{
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
}};

export const officialDataSummary: OfficialDataSummary = {json_ts(summary)};

export const officialEvidenceGroups: OfficialEvidenceGroup[] = {json_ts(evidence_groups)};

export const officialTemplateCandidates: OfficialTemplateCandidate[] = {json_ts(template_candidates)};

export const officialWorkbookTemplates: Record<string, OfficialWorkbookTemplate> = {json_ts(workbook_templates)};

export const officialWorkbookSummaries: OfficialWorkbookSummary[] = {json_ts(summaries)};
"""


def main() -> None:
    if not CATALOG_XLSX.exists():
        raise FileNotFoundError(CATALOG_XLSX)
    rows, _stats = catalog_rows()
    summaries, detected_scopes, evidence_groups, template_candidates, workbook_templates = workbook_summaries()
    rows = extend_rows_with_workbook_indicators(rows, workbook_templates)
    stats = catalog_stats(rows)
    scopes = catalog_plantel_scopes(rows, detected_scopes)

    backend_catalog_text = generate_catalog_file(rows, stats, scopes)
    frontend_catalog_text = generate_catalog_file(frontend_catalog_rows(rows), stats, scopes)
    backend_data_text = generate_data_file(summaries, evidence_groups, template_candidates, workbook_templates)
    frontend_data_text = generate_data_file(
        frontend_workbook_summaries(summaries),
        evidence_groups,
        frontend_template_candidates(template_candidates),
        frontend_workbook_templates(workbook_templates),
        frontend=True,
    )

    write_text(BACKEND_CATALOG_TARGET, backend_catalog_text)
    write_text(FRONTEND_CATALOG_TARGET, frontend_catalog_text)
    write_text(BACKEND_DATA_TARGET, backend_data_text)
    write_text(FRONTEND_DATA_TARGET, frontend_data_text)

    print(json.dumps({
        "catalog": stats,
        "workbooks": len(summaries),
        "scopedIndicators": len(scopes),
        "workbookTemplates": len(workbook_templates),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
