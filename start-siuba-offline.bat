@echo off
title SIUBA Offline Server
color 0A
echo ========================================================
echo        MEMULAI SERVER SIUBA (OFFLINE ^& WIFI LAN)
echo ========================================================
echo.

:: 1. Cek & Jalankan Database MySQL XAMPP jika belum aktif
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [1/2] Database MySQL (XAMPP): SUDAH AKTIF
) else (
    echo [1/2] Menyalakan Database MySQL (XAMPP)...
    start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    timeout /t 3 /nobreak >nul
    echo [1/2] Database MySQL: BERHASIL DIAKTIFKAN
)

echo.
echo [2/2] Mendeteksi Alamat IP Wi-Fi Komputer...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /r /c:"IPv4.*: 192\." /c:"IPv4.*: 10\." /c:"IPv4.*: 172\."') do (
    set LOCAL_IP=%%i
)
if defined LOCAL_IP (
    set LOCAL_IP=%LOCAL_IP: =%
) else (
    set LOCAL_IP=192.168.x.x
)

echo.
echo ========================================================
echo  SERVER SIUBA SIAP DIAKSES!
echo.
echo  1. Dari Laptop/Komputer ini (Offline):
echo     http://localhost:8000
echo     atau http://127.0.0.1:8000
echo.
echo  2. Dari HP / Tablet / Laptop Lain lewat Wi-Fi:
echo     http://%LOCAL_IP%:8000
echo.
echo  *Pastikan perangkat lain terhubung ke Wi-Fi yang sama.*
echo  *JANGAN TUTUP JENDELA INI SELAMA APLIKASI DIGUNAKAN.*
echo ========================================================
echo.

php artisan serve --host=0.0.0.0 --port=8000
