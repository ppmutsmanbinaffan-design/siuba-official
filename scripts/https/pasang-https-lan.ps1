# SIUBA - Pasang HTTPS LAN (tahap 29)
# Membuat sertifikat lokal (CA SIUBA + sertifikat server untuk IP komputer ini) lalu menyalakan
# Apache XAMPP di port 8443 sebagai pintu HTTPS yang meneruskan ke aplikasi di port 8000.
# Aman diulang: CA dibuat sekali saja (HP yang sudah memasang sertifikat tidak perlu memasang ulang),
# sertifikat server dibuat ulang mengikuti IP terbaru.
param([int]$Port = 8443, [string]$Xampp = 'C:\xampp')

# 'Continue': di Windows PowerShell 5.1, 'Stop' membuat keluaran stderr openssl/httpd dianggap galat.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dir = Join-Path $root 'storage\app\https'
$openssl = Join-Path $Xampp 'apache\bin\openssl.exe'
$httpd = Join-Path $Xampp 'apache\bin\httpd.exe'
$httpdConf = Join-Path $Xampp 'apache\conf\httpd.conf'
$siubaConf = Join-Path $Xampp 'apache\conf\extra\siuba-https.conf'

function Info($m) { Write-Host "  $m" }
function Fail($m) { Write-Host ""; Write-Host "[GAGAL] $m" -ForegroundColor Red; exit 1 }

Write-Host "========================================================"
Write-Host "        PASANG HTTPS UNTUK JARINGAN PESANTREN (LAN)"
Write-Host "========================================================"
if (-not (Test-Path $openssl)) { Fail "OpenSSL XAMPP tidak ditemukan di $openssl" }
if (-not (Test-Path $httpd)) { Fail "Apache XAMPP tidak ditemukan di $httpd" }
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# 1. Alamat IP komputer ini di jaringan
$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress -Unique)
if ($ips.Count -eq 0) { Fail "Komputer ini belum tersambung ke jaringan (tidak ada alamat IP)." }
Write-Host ""
Write-Host "[1/5] Alamat IP komputer server: $($ips -join ', ')"

$env:OPENSSL_CONF = Join-Path $dir 'openssl-min.cnf'
Set-Content -Path $env:OPENSSL_CONF -Encoding ASCII -Value "[req]`ndistinguished_name=dn`n[dn]`n"

# 2. CA lokal SIUBA (sekali saja)
$caKey = Join-Path $dir 'siuba-ca.key'
$caCrt = Join-Path $dir 'siuba-ca.crt'
if ((Test-Path $caKey) -and (Test-Path $caCrt)) {
    Write-Host "[2/5] Sertifikat induk (CA) SIUBA sudah ada - dipakai ulang."
} else {
    Write-Host "[2/5] Membuat sertifikat induk (CA) SIUBA..."
    $caExt = Join-Path $dir 'ca.ext'
    Set-Content -Path $caExt -Encoding ASCII -Value @"
[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
"@
    & $openssl genrsa -out $caKey 2048 2>$null
    & $openssl req -x509 -new -key $caKey -sha256 -days 3650 -subj "/CN=SIUBA Pesantren Local CA/O=SIUBA" `
        -extensions v3_ca -config $caExt -out $caCrt 2>$null
    if (-not (Test-Path $caCrt)) { Fail "Pembuatan CA gagal." }
}

# 3. Sertifikat server untuk IP saat ini
Write-Host "[3/5] Membuat sertifikat server..."
$san = @('DNS:localhost', "DNS:$($env:COMPUTERNAME)", 'IP:127.0.0.1') + ($ips | ForEach-Object { "IP:$_" })
$srvExt = Join-Path $dir 'server.ext'
Set-Content -Path $srvExt -Encoding ASCII -Value @"
[v3_srv]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $($san -join ', ')
"@
$srvKey = Join-Path $dir 'server.key'
$srvCsr = Join-Path $dir 'server.csr'
$srvCrt = Join-Path $dir 'server.crt'
& $openssl genrsa -out $srvKey 2048 2>$null
& $openssl req -new -key $srvKey -subj "/CN=SIUBA Server/O=SIUBA" -out $srvCsr 2>$null
& $openssl x509 -req -in $srvCsr -CA $caCrt -CAkey $caKey -CAcreateserial -days 825 -sha256 `
    -extfile $srvExt -extensions v3_srv -out $srvCrt 2>$null
if (-not (Test-Path $srvCrt)) { Fail "Pembuatan sertifikat server gagal." }
Info "Berlaku untuk: $($san -join ', ')"

# 4. Konfigurasi Apache
Write-Host "[4/5] Menyiapkan Apache XAMPP di port $Port..."
$crtPath = $srvCrt -replace '\\', '/'
$keyPath = $srvKey -replace '\\', '/'
Set-Content -Path $siubaConf -Encoding ASCII -Value @"
# Dibuat oleh SIUBA pasang-https-lan. Hapus dengan hapus-https-lan.bat.
<IfModule !ssl_module>
    LoadModule ssl_module modules/mod_ssl.so
</IfModule>
<IfModule !socache_shmcb_module>
    LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
</IfModule>
<IfModule !proxy_module>
    LoadModule proxy_module modules/mod_proxy.so
</IfModule>
<IfModule !proxy_http_module>
    LoadModule proxy_http_module modules/mod_proxy_http.so
</IfModule>
<IfModule !headers_module>
    LoadModule headers_module modules/mod_headers.so
</IfModule>

Listen $Port
<VirtualHost _default_:$Port>
    SSLEngine on
    SSLCertificateFile "$crtPath"
    SSLCertificateKeyFile "$keyPath"
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    ProxyRequests Off
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "$Port"
    ProxyPass / http://127.0.0.1:8000/ retry=0 timeout=120
    ProxyPassReverse / http://127.0.0.1:8000/
    ErrorDocument 503 "SIUBA belum berjalan. Jalankan jalankan-siuba.bat di komputer server."
</VirtualHost>
"@

$includeLine = 'Include "conf/extra/siuba-https.conf"'
$conf = Get-Content -Raw -Path $httpdConf
$backup = "$httpdConf.sebelum-siuba-https"
if ($conf -notmatch [regex]::Escape('conf/extra/siuba-https.conf')) {
    if (-not (Test-Path $backup)) { Copy-Item $httpdConf $backup }
    Add-Content -Path $httpdConf -Encoding ASCII -Value "`r`n# SIUBA HTTPS LAN`r`n$includeLine"
}
$test = & $httpd -t 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    if (Test-Path $backup) { Copy-Item $backup $httpdConf -Force }
    Remove-Item $siubaConf -ErrorAction SilentlyContinue
    Write-Host $test
    Fail "Konfigurasi Apache ditolak - perubahan dibatalkan, httpd.conf dikembalikan seperti semula."
}
Info "Konfigurasi Apache valid."

# Firewall Windows
netsh advfirewall firewall delete rule name="SIUBA HTTPS $Port" | Out-Null
netsh advfirewall firewall add rule name="SIUBA HTTPS $Port" dir=in action=allow protocol=TCP localport=$Port profile=private,domain | Out-Null
Info "Firewall: port $Port dibuka untuk jaringan Private/Domain."

# 5. Nyalakan / muat ulang Apache
Write-Host "[5/5] Menyalakan Apache..."
$svc = Get-Service -Name 'Apache2.4' -ErrorAction SilentlyContinue
if ($svc) {
    Restart-Service -Name 'Apache2.4' -Force
} else {
    Get-Process httpd -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
    Start-Process -FilePath $httpd -WorkingDirectory (Join-Path $Xampp 'apache') -WindowStyle Hidden
}
Start-Sleep -Seconds 3
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Write-Host ""
    Write-Host "[PERINGATAN] Apache belum menyala di port $Port." -ForegroundColor Yellow
    Write-Host "  Biasanya karena port 80 atau 443 dipakai program lain (Skype, IIS, VMware)."
    Write-Host "  Lihat $Xampp\apache\logs\error.log, atau nyalakan Apache dari XAMPP Control Panel."
} else {
    Info "Apache aktif di port $Port."
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " SELESAI. Alamat HTTPS untuk HP petugas:" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "     https://$($ip):$Port" -ForegroundColor Green }
Write-Host ""
Write-Host " Sekali per HP: buka http://$($ips[0]):8000/sertifikat lalu ikuti petunjuk"
Write-Host " memasang sertifikat SIUBA. Setelah itu kamera scan QR bisa dipakai."
Write-Host " Bila IP komputer berubah, jalankan skrip ini lagi (HP tidak perlu pasang ulang)."
Write-Host "========================================================" -ForegroundColor Green
