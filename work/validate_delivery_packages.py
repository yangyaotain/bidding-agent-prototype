from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "bid-documents"
PACKAGE_DIR = SOURCE_DIR / "packages"
PROJECT_NAME = "某港口集团2026年度集装箱业务平台运维项目"

EXPECTED = {
    f"{PROJECT_NAME}_Word文件套.zip": {
        "01_技术标/技术标.docx": SOURCE_DIR / "technical.docx",
        "02_商务标/商务标.docx": SOURCE_DIR / "business.docx",
    },
    f"{PROJECT_NAME}_PDF文件套.zip": {
        "01_技术标/技术标.pdf": SOURCE_DIR / "technical.pdf",
        "02_商务标/商务标.pdf": SOURCE_DIR / "business.pdf",
    },
}


def digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def main() -> None:
    assert {path.name for path in PACKAGE_DIR.glob("*.zip")} == set(EXPECTED)
    for package_name, entries in EXPECTED.items():
        package_path = PACKAGE_DIR / package_name
        assert package_path.exists()
        with ZipFile(package_path) as package:
            assert package.testzip() is None
            assert set(package.namelist()) == set(entries)
            for archive_name, source_path in entries.items():
                info = package.getinfo(archive_name)
                assert info.flag_bits & 0x800, f"{archive_name}: UTF-8 flag missing"
                data = package.read(archive_name)
                assert digest(data) == digest(source_path.read_bytes())
                assert not archive_name.lower().endswith(".bin")
                if archive_name.lower().endswith(".pdf"):
                    assert data.startswith(b"%PDF-")
                if archive_name.lower().endswith(".docx"):
                    with ZipFile(BytesIO(data)) as document:
                        assert document.testzip() is None
                        assert "word/document.xml" in document.namelist()
        print(f"PASS {package_name}: files={len(entries)}, bytes={package_path.stat().st_size}")


if __name__ == "__main__":
    main()
