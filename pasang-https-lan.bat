@echo off
title SIUBA - Pasang HTTPS LAN
cd /d "%~dp0"
:: Perlu hak administrator (firewall Windows dan Apache)
net session >nul 2>&1
if errorlevel 1 (
    echo Meminta izin administrator...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\https\pasang-https-lan.ps1"
echo.
pause
