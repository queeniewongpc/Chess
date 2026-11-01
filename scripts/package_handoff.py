#!/usr/bin/env python3
"""Refresh the Sites upload, then the portable project including that upload."""

import os
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SITES_ZIP = ROOT / "sites" / "between-sites.zip"
HANDOFF_ZIP = ROOT / "handoff" / "between-handoff.zip"
EXCLUDED_DIRS = {
    "handoff", "node_modules", ".data", ".git", "__pycache__", ".cache",
    ".venv", "venv", "playwright-report", "test-results",
}
EXCLUDED_FILES = {".DS_Store", "Thumbs.db"}
PRIVATE_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".log", ".pyc"}
DEMO_VIDEO_SUFFIXES = {".mp4", ".m4v", ".mov", ".webm", ".avi", ".mkv"}
HANDOFF_README = """# Share Queenie’s

Give someone this README and `between-handoff.zip`.
Unzip it and open `between-chess/` in Codex, or give the ZIP to an AI that can extract it.
Say **\"Open this project.\"** Read `AGENTS.md`; the portable project and the complete `sites/` upload folder are included.
Continue only with the user's next request. Publish only when explicitly requested.
"""


def project_files(include_sites_zip=False):
    """Include new project folders automatically; never follow symbolic links."""
    for directory, directories, names in os.walk(ROOT, followlinks=False):
        parent = Path(directory)
        directories[:] = sorted(
            name for name in directories
            if name not in EXCLUDED_DIRS and not (parent / name).is_symlink()
        )
        for name in sorted(names):
            path = parent / name
            if path.is_symlink() or name in EXCLUDED_FILES or name.startswith(".env"):
                continue
            if path.suffix in PRIVATE_SUFFIXES or name.endswith(".zip.tmp"):
                continue
            # Keep local recordings, but omit them from both archives so the
            # nested Sites package cannot reintroduce videos into the handoff.
            if path.relative_to(ROOT).parts[0] == "artifacts" and (
                path.suffix.lower() in DEMO_VIDEO_SUFFIXES
                or any(f"{suffix}.sb-" in name.lower() for suffix in DEMO_VIDEO_SUFFIXES)
            ):
                continue
            if path == SITES_ZIP and not include_sites_zip:
                continue
            yield path


def write_archive(output, paths):
    temporary = output.with_suffix(".zip.tmp")
    paths = sorted(paths)
    try:
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for path in paths:
                archive.write(path, Path("between-chess") / path.relative_to(ROOT))
        with ZipFile(temporary) as archive:
            broken = archive.testzip()
            if broken:
                raise SystemExit("Archive verification failed: " + broken)
            for path in paths:
                name = str(Path("between-chess") / path.relative_to(ROOT))
                if archive.read(name) != path.read_bytes():
                    raise SystemExit("A source changed during packaging; run again: " + name)
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    digest = sha256(output.read_bytes()).hexdigest()
    print(f"Created {output.relative_to(ROOT)}: {len(paths)} files, {output.stat().st_size:,} bytes")
    print(f"SHA-256: {digest}")


def main():
    # The handoff directory intentionally does not travel inside its own ZIP.
    # Recreate its small entry file so recipients can repackage after editing.
    HANDOFF_ZIP.parent.mkdir(exist_ok=True)
    handoff_readme = HANDOFF_ZIP.parent / "README.md"
    if not handoff_readme.exists():
        handoff_readme.write_text(HANDOFF_README, encoding="utf-8")
    required = (
        "AGENTS.md", "README.md", "docs/PROJECT.md", "docs/LOCAL_TESTING.md",
        "docs/SITES.md", "sites/README.md", "handoff/README.md",
        "package.json", "package-lock.json", "dist/index.html",
    )
    missing = [name for name in required if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit("Run npm run package from the complete project. Missing: " + ", ".join(missing))
    for directory, archive in ((SITES_ZIP.parent, SITES_ZIP), (HANDOFF_ZIP.parent, HANDOFF_ZIP)):
        # Finder and Explorer may add metadata when the owner opens a delivery folder.
        for name in EXCLUDED_FILES:
            metadata = directory / name
            if metadata.is_file() and not metadata.is_symlink():
                metadata.unlink()
        unexpected = {path.name for path in directory.iterdir()} - {"README.md", archive.name}
        if unexpected:
            raise SystemExit(f"Keep {directory.name}/ to README.md and its ZIP; move these files first: " + ", ".join(sorted(unexpected)))
    write_archive(SITES_ZIP, project_files())
    write_archive(HANDOFF_ZIP, project_files(include_sites_zip=True))
    print("Ready: handoff/ has the complete project; sites/ has the @Sites upload.")


if __name__ == "__main__":
    main()
