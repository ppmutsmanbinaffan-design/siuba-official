@echo off
title SIUBA - Server Aplikasi
color 0A
cd /d "%~dp0"
set PHP=C:\xampp\php\php.exe
set MYSQL=C:\xampp\mysql\bin\mysql.exe

echo ========================================================
echo              MENJALANKAN APLIKASI SIUBA
echo ========================================================
echo.

if not exist "%PHP%" (
    echo [GAGAL] PHP XAMPP tidak ditemukan di %PHP%
    pause
    exit /b 1
)

:: 1. Pastikan MySQL XAMPP menyala
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if errorlevel 1 (
    echo [1/4] Menyalakan MySQL XAMPP...
    start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    timeout /t 5 /nobreak >nul
) else (
    echo [1/4] MySQL XAMPP sudah aktif.
)

:: 2. Pastikan database siuba_db ada
echo [2/4] Memeriksa database siuba_db...
"%MYSQL%" -u root -e "CREATE DATABASE IF NOT EXISTS siuba_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul

:: 3. Perbarui struktur database + hak akses (aman diulang, data tidak dihapus)
echo [3/4] Memperbarui struktur database (migrasi)...
"%PHP%" artisan optimize:clear >nul
"%PHP%" artisan siuba:bersihkan-aset
"%PHP%" artisan migrate --force
if errorlevel 1 (
    echo.
    echo [GAGAL] Migrasi database gagal. Lihat pesan di atas.
    pause
    exit /b 1
)
"%PHP%" artisan db:seed --class=RolePermissionSeeder --force
"%PHP%" artisan db:seed --class=AdminUserSeeder --force
"%PHP%" artisan db:seed --class=ActivityCategorySeeder --force
"%PHP%" artisan system:backup --notes="Backup otomatis saat aplikasi dinyalakan" --if-older-than=20
:: Akun contoh bawaan versi lama: hapus yang tidak terpakai, nonaktifkan yang pernah dipakai (sesudah backup)
"%PHP%" artisan siuba:hapus-akun-contoh

:: Ingatkan bila penjadwal otomatis (auto-close sesi, backup harian) belum dipasang
schtasks /Query /TN "SIUBA Penjadwal" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Penjadwal otomatis belum dipasang. Jalankan pasang-penjadwal-windows.bat sekali saja
    echo        agar sesi absensi tertutup otomatis dan backup harian berjalan.
    echo.
)

:: HTTPS LAN (tahap 29): nyalakan Apache XAMPP bila HTTPS sudah dipasang dan Apache belum aktif
set HTTPS_INFO=
if exist "storage\app\https\server.crt" if exist "C:\xampp\apache\conf\extra\siuba-https.conf" (
    tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I "httpd.exe" >NUL
    if errorlevel 1 (
        echo [INFO] Menyalakan Apache XAMPP untuk HTTPS LAN port 8443...
        start "" /B /D "C:\xampp\apache" "C:\xampp\apache\bin\httpd.exe"
    )
    set HTTPS_INFO=1
)

:: 4. Jalankan server
echo.
echo ========================================================
echo  [4/4] SIUBA SIAP. Buka di browser:  http://localhost:8000
if defined HTTPS_INFO (
    echo  HP petugas ^(kamera scan QR^) pakai alamat HTTPS:
    for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /C:"IPv4"') do for /f "tokens=*" %%J in ("%%I") do echo     https://%%J:8443
)
echo  JANGAN TUTUP JENDELA INI selama aplikasi dipakai.
echo ========================================================
echo.
start "" /min cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:8000"
"%PHP%" artisan serve --host=0.0.0.0 --port=8000
pause
