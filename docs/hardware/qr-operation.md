# Panduan Operasional — Pemindai QR & Pencetakan Kartu

## 1. Spesifikasi Format QR Code Santri
- **Struktur Token**: Format terenkripsi/acak aman (`SIUBA-STU-XXXXXXXX` atau UUIDv4 terhash SHA256).
- **Karakteristik**: Tidak memuat data pribadi sensitif santri secara telanjang dalam teks QR. Validasi dilakukan oleh backend via pencarian index token unik.
- **Ukuran Cetak**: Minimal 2.5 cm x 2.5 cm dengan Quiet Zone 4 modul untuk keandalan pembacaan kamera smartphone beresolusi standar.

## 2. Praktik Terbaik Pemindaian
- Gunakan pencahayaan yang cukup di area pintu masuk.
- Jarak optimal kamera dengan kartu: 10–25 cm.
- Hindari laminasi kartu yang memantulkan kilau cahaya berlebih (*anti-glare lamination recommended*).
