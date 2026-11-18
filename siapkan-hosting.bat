@echo off
title SIUBA - Siapkan file untuk Hostinger
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\hosting\siapkan-hosting.ps1"
if errorlevel 1 (
    echo.
    echo [GAGAL] Lihat pesan di atas.
)
pause
