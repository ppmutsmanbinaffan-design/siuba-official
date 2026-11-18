<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Tahap 29 — halaman pemasangan sertifikat HTTPS LAN untuk HP petugas.
 * Hanya sertifikat induk publik (siuba-ca.crt) yang bisa diunduh; kunci privatnya tidak pernah disajikan.
 */
class HttpsCertificateController extends Controller
{
    private function caPath(): string
    {
        return storage_path('app/https/siuba-ca.crt');
    }

    public function download(): BinaryFileResponse|Response
    {
        if (!is_file($this->caPath())) {
            return response('Sertifikat belum dibuat. Jalankan pasang-https-lan.bat di komputer server.', 404)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }

        return response()->download($this->caPath(), 'siuba-ca.crt', [
            'Content-Type' => 'application/x-x509-ca-cert',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function page(Request $request): Response
    {
        $ready = is_file($this->caPath());
        $host = $request->getHost();
        $port = (int) config('siuba.https_port', 8443);
        $httpsUrl = "https://{$host}:{$port}";
        $secure = $request->isSecure();
        $fingerprint = $ready ? $this->fingerprint() : null;
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

        $status = $secure
            ? '<div class="box ok"><b>Anda sudah tersambung lewat HTTPS.</b> Sertifikat SIUBA sudah dipercaya perangkat ini — kamera scan QR bisa dipakai. <a class="btn" href="/">Buka SIUBA</a></div>'
            : ($ready
                ? '<div class="box">Ikuti langkah di bawah <b>sekali saja</b> di setiap HP petugas, lalu buka SIUBA lewat <b>' . $e($httpsUrl) . '</b>.</div>'
                : '<div class="box warn"><b>HTTPS belum dipasang di server.</b> Di komputer server, jalankan <code>pasang-https-lan.bat</code> (klik kanan → Run as administrator), lalu buka halaman ini lagi.</div>');

        $steps = !$ready ? '' : <<<HTML
<a class="btn big" href="/sertifikat/siuba-ca.crt">1. Unduh sertifikat SIUBA</a>
<h2>Android (Chrome)</h2>
<ol>
<li>Ketuk tombol unduh di atas. Bila diminta nama, isi <b>SIUBA</b> dan pilih penggunaan <b>VPN dan aplikasi</b> / <b>CA certificate</b>.</li>
<li>Bila tidak muncul otomatis: buka <b>Setelan → Keamanan → Enkripsi &amp; kredensial → Instal sertifikat → Sertifikat CA</b>, pilih file <code>siuba-ca.crt</code> di folder Download, lalu ketuk <b>Tetap instal</b>.</li>
<li>Tutup Chrome sepenuhnya, buka lagi, lalu kunjungi <a href="{$e($httpsUrl)}">{$e($httpsUrl)}</a>.</li>
</ol>
<h2>iPhone / iPad (Safari)</h2>
<ol>
<li>Buka halaman ini di <b>Safari</b>, ketuk tombol unduh, pilih <b>Izinkan</b>.</li>
<li>Buka <b>Pengaturan → Profil Diunduh</b> (atau Umum → VPN &amp; Manajemen Perangkat), ketuk <b>SIUBA Pesantren Local CA → Instal</b>.</li>
<li>Buka <b>Pengaturan → Umum → Mengenai → Pengaturan Kepercayaan Sertifikat</b>, aktifkan <b>SIUBA Pesantren Local CA</b>.</li>
<li>Kunjungi <a href="{$e($httpsUrl)}">{$e($httpsUrl)}</a>.</li>
</ol>
<h2>Laptop / komputer Windows</h2>
<ol>
<li>Unduh sertifikat, klik dua kali → <b>Install Certificate</b> → <b>Local Machine</b> → <b>Place all certificates in the following store</b> → <b>Trusted Root Certification Authorities</b>.</li>
<li>Tutup lalu buka lagi Chrome/Edge.</li>
</ol>
<p class="small">Sidik jari SHA-256 sertifikat (untuk dicocokkan admin): <code>{$e($fingerprint)}</code></p>
<p class="small">Sertifikat ini hanya berlaku untuk server SIUBA di jaringan pesantren. Pasang hanya bila halaman ini dibuka dari alamat server SIUBA Anda sendiri.</p>
HTML;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pasang Sertifikat HTTPS SIUBA</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f1f5f2;color:#0f172a}
main{max-width:640px;margin:0 auto;padding:20px}
h1{font-size:22px;color:#12382A;margin:8px 0 12px}h2{font-size:16px;margin:22px 0 6px;color:#1F5C45}
.box{background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin:12px 0;font-size:14px;line-height:1.5}
.ok{background:#ecfdf5;border-color:#6ee7b7}.warn{background:#fffbeb;border-color:#fcd34d}
.btn{display:inline-block;background:#1F5C45;color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:8px 14px;margin-top:6px}
.big{display:block;text-align:center;padding:14px;font-size:16px;margin:16px 0}
ol{padding-left:20px;font-size:14px;line-height:1.6}code{background:#e2e8f0;padding:1px 5px;border-radius:5px;word-break:break-all}
.small{font-size:12px;color:#334155}
</style></head><body><main>
<h1>Pasang Sertifikat HTTPS SIUBA</h1>
<p style="font-size:14px">Browser HP hanya mengizinkan kamera (scan QR) di alamat aman (HTTPS). Sertifikat ini membuat HP mempercayai server SIUBA di jaringan pesantren.</p>
{$status}
{$steps}
</main></body></html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    private function fingerprint(): ?string
    {
        $pem = @file_get_contents($this->caPath());
        if (!$pem) {
            return null;
        }
        $fp = function_exists('openssl_x509_fingerprint') ? @openssl_x509_fingerprint($pem, 'sha256') : null;

        return $fp ? strtoupper(implode(':', str_split($fp, 2))) : null;
    }
}
