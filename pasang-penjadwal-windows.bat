@echo off
title SIUBA - Pasang Penjadwal Otomatis
cd /d "%~dp0"
echo ========================================================
echo       PASANG PENJADWAL OTOMATIS SIUBA (Task Scheduler)
echo ========================================================
echo.
echo Penjadwal ini menjalankan pekerjaan otomatis SIUBA setiap menit:
echo   - menutup sesi absensi yang sudah lewat waktu (Auto-Close)
echo   - backup database harian (01:30)
echo   - membersihkan log lama (02:15)
echo Berjalan tanpa jendela, selama Anda masuk (login) ke Windows.
echo.

if not exist "C:\xampp\php\php.exe" (
    echo [PERINGATAN] PHP XAMPP tidak ditemukan di C:\xampp\php\php.exe
    echo              Penjadwal akan mencoba memakai "php" dari PATH.
    echo.
)

schtasks /Create /TN "SIUBA Penjadwal" /TR "wscript.exe \"%~dp0siuba-penjadwal.vbs\"" /SC MINUTE /MO 1 /F
if errorlevel 1 (
    echo.
    echo [GAGAL] Penjadwal tidak bisa dipasang. Coba klik kanan file ini lalu
    echo         pilih "Run as administrator".
    pause
    exit /b 1
)

echo.
echo Menjalankan penjadwal sekali untuk uji coba...
schtasks /Run /TN "SIUBA Penjadwal" >nul
echo.
echo [BERHASIL] Penjadwal terpasang dengan nama "SIUBA Penjadwal".
echo Cek statusnya di aplikasi: Maintenance Hub - Status (tanda penjadwal hidup).
echo Bila ada pekerjaan gagal, pesannya tercatat di storage\logs\laravel.log
echo Untuk melepas: jalankan hapus-penjadwal-windows.bat
echo.
pause
