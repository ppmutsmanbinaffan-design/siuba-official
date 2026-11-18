# SIUBA - Lepas HTTPS LAN: hapus konfigurasi Apache dan aturan firewall. Sertifikat tidak dihapus.
param([int]$Port = 8443, [string]$Xampp = 'C:\xampp')
$httpdConf = Join-Path $Xampp 'apache\conf\httpd.conf'
$siubaConf = Join-Path $Xampp 'apache\conf\extra\siuba-https.conf'
if (Test-Path $httpdConf) {
    $lines = Get-Content -Path $httpdConf | Where-Object { $_ -notmatch 'siuba-https\.conf' -and $_ -ne '# SIUBA HTTPS LAN' }
    Set-Content -Path $httpdConf -Encoding ASCII -Value $lines
}
Remove-Item $siubaConf -ErrorAction SilentlyContinue
netsh advfirewall firewall delete rule name="SIUBA HTTPS $Port" | Out-Null
$svc = Get-Service -Name 'Apache2.4' -ErrorAction SilentlyContinue
if ($svc) { Restart-Service -Name 'Apache2.4' -Force }
Write-Host "HTTPS LAN SIUBA dilepas. Bila Apache menyala dari XAMPP Control Panel, klik Stop lalu Start."
