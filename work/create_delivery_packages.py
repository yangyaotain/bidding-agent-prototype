from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "bid-documents"
PACKAGE_DIR = SOURCE_DIR / "packages"
PROJECT_NAME = "某港口集团2026年度集装箱业务平台运维项目"
WORD_PACKAGE = PACKAGE_DIR / f"{PROJECT_NAME}_Word文件套.zip"
PDF_PACKAGE = PACKAGE_DIR / f"{PROJECT_NAME}_PDF文件套.zip"

TECHNICAL_DOCX = SOURCE_DIR / "technical.docx"
BUSINESS_DOCX = SOURCE_DIR / "business.docx"
TECHNICAL_PDF = SOURCE_DIR / "technical.pdf"
BUSINESS_PDF = SOURCE_DIR / "business.pdf"


def write_package(path: Path, entries: list[tuple[Path, str]]) -> None:
    for source, _ in entries:
        if not source.exists():
            raise FileNotFoundError(source)
    with ZipFile(path, "w", compression=ZIP_DEFLATED, compresslevel=6) as package:
        for source, archive_name in entries:
            package.write(source, archive_name)


def main() -> None:
    PACKAGE_DIR.mkdir(parents=True, exist_ok=True)

    legacy_packages = [
        PACKAGE_DIR / "word-delivery-package.zip",
        PACKAGE_DIR / "pdf-delivery-package.zip",
        PACKAGE_DIR / "complete-delivery-package.zip",
    ]
    for path in legacy_packages:
        path.unlink(missing_ok=True)

    write_package(
        WORD_PACKAGE,
        [
            (TECHNICAL_DOCX, "01_技术标/技术标.docx"),
            (BUSINESS_DOCX, "02_商务标/商务标.docx"),
        ],
    )
    write_package(
        PDF_PACKAGE,
        [
            (TECHNICAL_PDF, "01_技术标/技术标.pdf"),
            (BUSINESS_PDF, "02_商务标/商务标.pdf"),
        ],
    )
    for path in sorted(PACKAGE_DIR.glob("*.zip")):
        print(f"{path.name}\t{path.stat().st_size}")


if __name__ == "__main__":
    main()
