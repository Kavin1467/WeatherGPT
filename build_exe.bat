@echo off
title WeatherGPT Executable Compiler - MoES / IMD
echo ===================================================================
echo   Compiling WeatherGPT Standalone Windows Executable (.exe)
echo ===================================================================
if exist ".venv\Scripts\python.exe" (
    .venv\Scripts\python.exe build_exe.py
) else (
    python build_exe.py
)
pause
