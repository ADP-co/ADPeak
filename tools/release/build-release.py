#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
import zipfile


REPO_ROOT = Path(__file__).resolve().parents[2]
BLOCKED_PARTS = {
    ".git",
    ".playwright-cli",
    ".vercel",
    "node_modules",
    "output",
    "playwright-report",
    "qa-runs",
    "test-results",
}
BLOCKED_SUFFIXES = {
    ".7z",
    ".csv",
    ".docx",
    ".env",
    ".pdf",
    ".rar",
    ".tar",
    ".tgz",
    ".xls",
    ".xlsx",
    ".zip",
}


def run_git(*args: str, text: bool = True) -> str | bytes:
    return subprocess.check_output(
        ["git", *args],
        cwd=REPO_ROOT,
        text=text,
        encoding="utf-8" if text else None,
    )


def tracked_paths() -> list[str]:
    paths = run_git("ls-tree", "-r", "--name-only", "HEAD").splitlines()
    accepted: list[str] = []

    for value in paths:
        path = PurePosixPath(value)
        if path.is_absolute() or ".." in path.parts or "\\" in value:
            raise RuntimeError(f"Ruta no portable detectada: {value}")
        if any(part in BLOCKED_PARTS for part in path.parts):
            continue
        if path.name.startswith(".env") and path.name not in {".env.example", ".env.demo.example"}:
            continue
        if path.suffix.lower() in BLOCKED_SUFFIXES:
            continue
        accepted.append(path.as_posix())

    return sorted(accepted)


def git_blob(path: str) -> bytes:
    return run_git("show", f"HEAD:{path}", text=False)


def zip_info(name: str, timestamp: tuple[int, int, int, int, int, int]) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(name, timestamp)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    return info


def verify_archive(archive: Path, expected_root: str, expected_paths: list[str]) -> None:
    with zipfile.ZipFile(archive) as package:
        corrupt = package.testzip()
        if corrupt:
            raise RuntimeError(f"Entrada ZIP corrupta: {corrupt}")

        names = package.namelist()
        if any("\\" in name for name in names):
            raise RuntimeError("El ZIP contiene separadores de Windows.")
        if any(PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts for name in names):
            raise RuntimeError("El ZIP contiene una ruta insegura.")

        expected = {f"{expected_root}/{path}" for path in expected_paths}
        actual_sources = {
            name for name in names
            if name not in {
                f"{expected_root}/RELEASE_MANIFEST.json",
                f"{expected_root}/RELEASE_NOTES.md",
            }
        }
        if actual_sources != expected:
            missing = sorted(expected - actual_sources)
            unexpected = sorted(actual_sources - expected)
            raise RuntimeError(f"Contenido ZIP inesperado. Faltantes={missing}; extra={unexpected}")


def verify_installation(archive: Path, expected_root: str) -> None:
    with tempfile.TemporaryDirectory(prefix="adpeak-release-") as temporary:
        destination = Path(temporary)
        with zipfile.ZipFile(archive) as package:
            package.extractall(destination)
        project = destination / expected_root
        npm = "npm.cmd" if os.name == "nt" else "npm"
        subprocess.run([npm, "ci", "--ignore-scripts"], cwd=project, check=True)
        subprocess.run([npm, "run", "check"], cwd=project, check=True)
        subprocess.run([sys.executable, "tools/import-official-data.test.py"], cwd=project, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Construye el ZIP reproducible y portable de ADPeak.")
    parser.add_argument("--output-dir", type=Path, default=REPO_ROOT.parent / "release")
    parser.add_argument("--verify-install", action="store_true")
    args = parser.parse_args()

    dirty = run_git("status", "--porcelain", "--untracked-files=normal").strip()
    if dirty:
        raise RuntimeError("El árbol versionado debe estar limpio antes de construir la entrega.")

    commit = run_git("rev-parse", "HEAD").strip()
    commit_epoch = int(run_git("show", "-s", "--format=%ct", "HEAD").strip())
    commit_time = datetime.fromtimestamp(commit_epoch, timezone.utc).replace(microsecond=0)
    timestamp = commit_time.timetuple()[:6]
    package_data = json.loads(git_blob("package.json").decode("utf-8"))
    version = str(package_data["version"])
    root_name = f"ADPeak-SIGI-POA-v{version}"
    archive = args.output_dir.resolve() / f"{root_name}-{commit[:7]}.zip"
    paths = tracked_paths()
    entries: list[dict[str, str | int]] = []

    args.output_dir.mkdir(parents=True, exist_ok=True)
    temporary_archive = archive.with_suffix(".zip.tmp")
    temporary_archive.unlink(missing_ok=True)

    with zipfile.ZipFile(temporary_archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for path in paths:
            content = git_blob(path)
            entries.append({
                "path": path,
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            })
            package.writestr(zip_info(f"{root_name}/{path}", timestamp), content)

        manifest = {
            "format": "adpeak-release-manifest-v1",
            "product": "ADPeak / SIGI-POA DGEMS",
            "version": version,
            "commit": commit,
            "sourceDate": commit_time.isoformat().replace("+00:00", "Z"),
            "entries": entries,
        }
        notes = (
            f"# ADPeak / SIGI-POA DGEMS v{version}\n\n"
            f"Código fuente certificado del commit `{commit}`.\n\n"
            "## Verificación\n\n"
            "```bash\n"
            "npm ci\n"
            "npm run repo:verify\n"
            "python tools/import-official-data.test.py\n"
            "```\n\n"
            "Las credenciales, evidencias y documentos institucionales no forman parte de este paquete.\n"
        )
        package.writestr(
            zip_info(f"{root_name}/RELEASE_MANIFEST.json", timestamp),
            (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
        )
        package.writestr(zip_info(f"{root_name}/RELEASE_NOTES.md", timestamp), notes.encode("utf-8"))

    temporary_archive.replace(archive)
    verify_archive(archive, root_name, paths)

    if args.verify_install:
        verify_installation(archive, root_name)

    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum = archive.with_suffix(".zip.sha256")
    checksum.write_text(f"{digest}  {archive.name}\n", encoding="ascii", newline="\n")
    print(json.dumps({"archive": str(archive), "sha256": digest, "entries": len(paths)}, indent=2))


if __name__ == "__main__":
    main()
