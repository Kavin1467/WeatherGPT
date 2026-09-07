"""
WeatherGPT Executable Builder
Compiles the complete WeatherGPT project into a standalone single-file .exe
using PyInstaller, including all frontend assets and backend modules.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def build():
    base_dir = Path(__file__).resolve().parent
    dist_dir = base_dir / "dist"
    build_dir = base_dir / "build"
    spec_file = base_dir / "WeatherGPT.spec"
    root_exe = base_dir / "WeatherGPT.exe"

    print("=" * 65)
    print("  Building WeatherGPT Standalone Windows Executable (.exe)")
    print("  Ministry of Earth Sciences (MoES) & India Meteorological Dept")
    print("=" * 65)

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--name=WeatherGPT",
        "--onefile",
        "--clean",
        "--add-data", f"{base_dir / 'frontend'};frontend",
        "--add-data", f"{base_dir / 'backend'};backend",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespans",
        "--hidden-import=uvicorn.lifespans.on",
        "--hidden-import=uvicorn.lifespans.off",
        "--hidden-import=webview",
        "--hidden-import=clr_loader",
        "--hidden-import=pythonnet",
        "--hidden-import=cffi",
        str(base_dir / "run_desktop.py")
    ]

    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(base_dir))

    if result.returncode == 0:
        compiled_exe = dist_dir / "WeatherGPT.exe"
        if compiled_exe.exists():
            # Also copy to root for immediate user access
            shutil.copy2(compiled_exe, root_exe)
            print("\n" + "=" * 65)
            print("  SUCCESS! Standalone Executable Created:")
            print(f"  -> Root Executable: {root_exe}")
            print(f"  -> Dist Executable: {compiled_exe}")
            print(f"  Size: {round(root_exe.stat().st_size / (1024 * 1024), 2)} MB")
            print("=" * 65)
            return True
        else:
            print("ERROR: Output executable not found in dist/")
            return False
    else:
        print(f"PyInstaller failed with exit code {result.returncode}")
        return False

if __name__ == "__main__":
    success = build()
    sys.exit(0 if success else 1)
