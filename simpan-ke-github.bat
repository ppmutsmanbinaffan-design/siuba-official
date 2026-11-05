@echo off
title Simpan ke GitHub (presensi-siuba2)
color 0B
echo ========================================================
echo    MENYIMPAN PROJECT KE REPO BARU: presensi-siuba2
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Mengatur alamat GitHub ke https://github.com/Asep1403/presensi-siuba2.git ...
"C:\Program Files\Git\cmd\git.exe" remote set-url origin https://github.com/Asep1403/presensi-siuba2.git

echo [2/3] Menyiapkan seluruh file untuk di-commit...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: full SIUBA Laravel 12 + MySQL setup" 2>nul

echo [3/3] Mengirim (Push) ke GitHub https://github.com/Asep1403/presensi-siuba2 ...
echo (Jika muncul jendela Sign in to GitHub, silakan klik "Sign in with your browser")
echo.
"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo  BERHASIL! Project sudah tersimpan di:
    echo  https://github.com/Asep1403/presensi-siuba2
    echo ========================================================
) else (
    color 0C
    echo ========================================================
    echo  GAGAL MENYIMPAN.
    echo  Pastikan Anda sudah membuat repo "presensi-siuba2" di
    echo  https://github.com/new dan sudah login ke GitHub.
    echo ========================================================
)
echo.
pause
