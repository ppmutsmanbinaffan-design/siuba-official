# SIUBA - siapkan file untuk dipasang di Hostinger.
# Membuat di folder kirim-hosting\ :
#   .env                 -> pengaturan untuk hosting (diambil dari .env komputer ini; APP_KEY & kunci mesin RFID tetap sama)
#   siuba-database.sql   -> salinan seluruh data dari MySQL XAMPP
# File siuba-hosting.zip (kode aplikasi) sudah disiapkan Claude di folder yang sama.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$out = Join-Path $root 'kirim-hosting'
New-Item -ItemType Directory -Force -Path $out | Out-Null

Write-Host '========================================================'
Write-Host '  MENYIAPKAN SIUBA UNTUK HOSTINGER'
Write-Host '========================================================'
Write-Host 'Siapkan data dari hPanel > Databases > Management (database MySQL yang sudah Anda buat).'
Write-Host ''

$envPath = Join-Path $root '.env'
if (-not (Test-Path $envPath)) { throw 'File .env di folder aplikasi tidak ditemukan.' }
$lines = [System.IO.File]::ReadAllLines($envPath)
function Get-EnvValue([string]$key, [string]$default) {
    foreach ($l in $lines) {
        if ($l -match "^\s*$key\s*=\s*(.*)$") { return $Matches[1].Trim().Trim('"').Trim("'") }
    }
    return $default
}

$domain = (Read-Host 'Nama domain (contoh: absensi.pesantrenku.sch.id, tanpa https://)').Trim().TrimEnd('/')
$domain = $domain -replace '^https?://', ''
if (-not $domain) { throw 'Domain wajib diisi.' }
$dbName = (Read-Host 'Nama database MySQL di hPanel (contoh: u123456789_siuba)').Trim()
$dbUser = (Read-Host 'Username database di hPanel (contoh: u123456789_admin)').Trim()
$sec = Read-Host 'Password database di hPanel (tidak terlihat saat diketik)' -AsSecureString
$dbPass = (New-Object System.Net.NetworkCredential("", $sec)).Password
if (-not $dbName -or -not $dbUser -or -not $dbPass) { throw 'Nama, username, dan password database wajib diisi.' }

function Quote([string]$v) {
    if ($v -notmatch "'") { return "'" + $v + "'" }
    return '"' + ($v -replace '\\', '\\' -replace '"', '\"') + '"'
}

$set = [ordered]@{
    'APP_ENV' = 'production'; 'APP_DEBUG' = 'false'; 'APP_URL' = "https://$domain"; 'LOG_LEVEL' = 'warning';
    'DB_CONNECTION' = 'mysql'; 'DB_HOST' = 'localhost'; 'DB_PORT' = '3306';
    'DB_DATABASE' = $dbName; 'DB_USERNAME' = $dbUser; 'DB_PASSWORD' = (Quote $dbPass);
    'SESSION_SECURE_COOKIE' = 'true'; 'SIUBA_ALLOW_DATABASE_RESET' = 'false'
}
$done = @{}
$new = foreach ($l in $lines) {
    if ($l -match '^\s*([A-Z0-9_]+)\s*=') {
        $k = $Matches[1]
        if ($set.Contains($k)) { $done[$k] = $true; "$k=$($set[$k])"; continue }
        if ($k -eq 'FRONTEND_URL') { "FRONTEND_URL=https://$domain"; continue }
    }
    $l
}
$extra = foreach ($k in $set.Keys) { if (-not $done[$k]) { "$k=$($set[$k])" } }
$all = @($new) + @($extra)
[System.IO.File]::WriteAllLines((Join-Path $out '.env'), $all, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[1/2] Pengaturan hosting dibuat: kirim-hosting\.env"

# Salin database dari XAMPP
$dump = 'C:\xampp\mysql\bin\mysqldump.exe'
if (-not (Test-Path $dump)) { throw "mysqldump XAMPP tidak ditemukan di $dump" }
if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) { throw 'MySQL XAMPP belum menyala. Jalankan jalankan-siuba.bat dulu, lalu ulangi.' }
$localDb = Get-EnvValue 'DB_DATABASE' 'siuba_db'
$localUser = Get-EnvValue 'DB_USERNAME' 'root'
$localPass = Get-EnvValue 'DB_PASSWORD' ''
$sql = Join-Path $out 'siuba-database.sql'
$dumpArgs = @('-u', $localUser, '--single-transaction', '--default-character-set=utf8mb4', '--no-tablespaces', '--skip-comments', "--result-file=$sql", $localDb)
if ($localPass) { $dumpArgs = @("-p$localPass") + $dumpArgs }
& $dump @dumpArgs
if ($LASTEXITCODE -ne 0) { throw 'Gagal menyalin database dari XAMPP.' }
# Kolasi khusus MariaDB baru tidak dikenal sebagian server MySQL hosting
$text = [System.IO.File]::ReadAllText($sql)
$text = $text -replace 'utf8mb4_uca1400_ai_ci', 'utf8mb4_unicode_ci'
[System.IO.File]::WriteAllText($sql, $text, (New-Object System.Text.UTF8Encoding($false)))
$mb = [Math]::Round((Get-Item $sql).Length / 1MB, 1)
Write-Host "[2/2] Database disalin: kirim-hosting\siuba-database.sql ($mb MB)"

Write-Host ''
Write-Host '========================================================'
Write-Host ' SELESAI. Isi folder kirim-hosting:'
Write-Host '   siuba-hosting.zip   -> unggah ke public_html lalu Extract'
Write-Host '   .env                -> unggah ke public_html'
Write-Host '   siuba-database.sql  -> Import di phpMyAdmin hPanel'
Write-Host ' JANGAN kirim file .env dan .sql ke orang lain (berisi password & data santri).'
Write-Host '========================================================'
Start-Process explorer.exe $out
