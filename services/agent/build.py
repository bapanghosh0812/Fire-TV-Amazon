"""Packages the agent for AgentCore Runtime direct code deployment.

AgentCore runs Linux on arm64, so dependencies are installed as
manylinux aarch64 wheels (works from Windows/macOS too, no Docker needed).
Output: dist/agent.zip
"""

import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).parent
BUILD = HERE / "build" / "package"
DIST = HERE / "dist" / "agent.zip"
PY = "3.13"


def main() -> None:
    if BUILD.exists():
        shutil.rmtree(BUILD)
    BUILD.mkdir(parents=True)
    subprocess.run(
        [
            sys.executable, "-m", "uv", "pip", "install",
            "--python-platform", "aarch64-manylinux2014",
            "--python-version", PY,
            "--target", str(BUILD),
            "--only-binary=:all:",
            "--quiet",
            "-r", str(HERE / "requirements.txt"),
        ],
        check=True,
    )
    shutil.copy2(HERE / "main.py", BUILD / "main.py")
    shutil.copytree(HERE / "storyloom", BUILD / "storyloom", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    DIST.parent.mkdir(parents=True, exist_ok=True)
    if DIST.exists():
        DIST.unlink()
    with zipfile.ZipFile(DIST, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for path in sorted(BUILD.rglob("*")):
            if "__pycache__" in path.parts or path.suffix == ".pyc":
                continue
            rel = path.relative_to(BUILD).as_posix()
            info = zipfile.ZipInfo.from_file(path, rel)
            # AgentCore needs 644 for files and 755 for directories.
            info.external_attr = ((0o40755 if path.is_dir() else 0o100644) << 16)
            if path.is_dir():
                z.writestr(info, b"")
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
                with open(path, "rb") as f:
                    z.writestr(info, f.read())
    size = os.path.getsize(DIST) / 1024 / 1024
    print(f"built {DIST} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
