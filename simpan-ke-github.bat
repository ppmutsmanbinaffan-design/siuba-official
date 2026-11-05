@echo off
title Simpan ke GitHub (siuba-official)
color 0B
echo ========================================================
echo    MENYIMPAN PROJECT KE REPO: siuba-official
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Mengatur alamat GitHub ke https://github.com/ppmutsmanbinaffan-design/siuba-official.git ...
"C:\Program Files\Git\cmd\git.exe" remote set-url origin https://ppmutsmanbinaffan-design@github.com/ppmutsmanbinaffan-design/siuba-official.git

echo [2/3] Menyiapkan seluruh file untuk di-commit...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: sync latest changes" 2>nul

echo [3/3] Mengirim (Push) ke GitHub https://github.com/ppmutsmanbinaffan-design/siuba-official ...
echo (Jika muncul jendela Sign in to GitHub, silakan klik "Sign in with your browser")
echo.
"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo  BERHASIL! Project sudah tersimpan di:
    echo  https://github.com/ppmutsmanbinaffan-design/siuba-official
    echo ========================================================
) else (
    color 0C
    echo ========================================================
    echo  GAGAL MENYIMPAN.
    echo  Pastikan Anda memiliki izin akses ke repo siuba-official
    echo  dan sudah login ke GitHub.
    echo ========================================================
)
echo.
pause
