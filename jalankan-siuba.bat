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

:: Ingatkan bila penjadwal otomatis (auto-close sesi, backup harian) belum dipasang
schtasks /Query /TN "SIUBA Penjadwal" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Penjadwal otomatis belum dipasang. Jalankan pasang-penjadwal-windows.bat sekali saja
    echo        agar sesi absensi tertutup otomatis dan backup harian berjalan.
    echo.
)

:: 4. Jalankan server
echo.
echo ========================================================
echo  [4/4] SIUBA SIAP. Buka di browser:  http://localhost:8000
echo  JANGAN TUTUP JENDELA INI selama aplikasi dipakai.
echo ========================================================
echo.
start "" /min cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:8000"
"%PHP%" artisan serve --host=0.0.0.0 --port=8000
pause
