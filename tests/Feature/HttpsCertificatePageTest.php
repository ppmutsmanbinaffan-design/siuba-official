<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

/** Tahap 29: halaman & unduhan sertifikat HTTPS LAN — hanya sertifikat publik, kunci privat tidak pernah tersaji. */
class HttpsCertificatePageTest extends TestCase
{
    private string $dir;
    private ?string $backup = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = storage_path('app/https');
        if (File::isDirectory($this->dir)) {
            $this->backup = sys_get_temp_dir() . '/siuba-https-backup-' . uniqid();
            File::moveDirectory($this->dir, $this->backup);
        }
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        if ($this->backup) {
            File::moveDirectory($this->backup, $this->dir);
        }
        parent::tearDown();
    }

    public function test_page_explains_when_https_not_installed(): void
    {
        $this->get('/sertifikat')->assertOk()->assertSee('HTTPS belum dipasang di server', false);
        $this->get('/sertifikat/siuba-ca.crt')->assertNotFound();
    }

    public function test_download_serves_only_public_ca_certificate(): void
    {
        File::ensureDirectoryExists($this->dir);
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'SIUBA Test CA'], $key);
        $crt = openssl_csr_sign($csr, null, $key, 30);
        openssl_x509_export($crt, $pem);
        openssl_pkey_export($key, $keyPem);
        File::put($this->dir . '/siuba-ca.crt', $pem);
        File::put($this->dir . '/siuba-ca.key', $keyPem);

        $page = $this->get('/sertifikat')->assertOk();
        $page->assertSee('Unduh sertifikat SIUBA', false)->assertSee('https://localhost:8443', false);
        $this->assertStringNotContainsString('PRIVATE KEY', $page->getContent());

        $dl = $this->get('/sertifikat/siuba-ca.crt')->assertOk();
        $this->assertStringContainsString('application/x-x509-ca-cert', $dl->headers->get('Content-Type'));
        $this->assertStringContainsString('BEGIN CERTIFICATE', file_get_contents($dl->baseResponse->getFile()->getPathname()));

        $this->get('/sertifikat/siuba-ca.key')->assertDontSee('PRIVATE KEY', false);
    }

    public function test_https_via_trusted_proxy_is_detected(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '8443'])
            ->get('/sertifikat')->assertSee('sudah tersambung lewat HTTPS', false);
    }

    public function test_forwarded_header_from_other_host_is_not_trusted(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.50'])
            ->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->get('/sertifikat')->assertDontSee('sudah tersambung lewat HTTPS', false);
    }
}
