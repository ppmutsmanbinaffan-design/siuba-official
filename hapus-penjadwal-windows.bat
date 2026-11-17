@echo off
title SIUBA - Lepas Penjadwal Otomatis
schtasks /Delete /TN "SIUBA Penjadwal" /F
if errorlevel 1 (
    echo Penjadwal "SIUBA Penjadwal" tidak ditemukan atau sudah dilepas.
) else (
    echo [BERHASIL] Penjadwal SIUBA dilepas. Pekerjaan otomatis tidak berjalan lagi.
)
pause
