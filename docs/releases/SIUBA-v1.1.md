# SIUBA v1.1 Release Notes (Production Baseline STABLE)

## Ringkasan Rilis
Versi SIUBA v1.1.5 menandai finalisasi Modul Absensi SDM Terpadu Pesantren (Tenaga Pendidik & Kependidikan). Seluruh modul mencakup Presensi Harian, Presensi Mengajar Guru (KBM), Presensi Pelatih Ekstrakurikuler, Dashboard Analitik Multi-Domain, Pusat Laporan Resmi KOP Surat & Dossier Matriks 360, serta Audit Integritas Data Relasional.

### Milestone Versi (v1.1.1 - v1.1.5)
1. **v1.1.1 — Master SDM & Presensi Harian**: Single Staff Master, pencegahan duplikasi NIP/QR/RFID, shift & hierarki jadwal kerja, terminal QR/RFID, worklist check-out & koreksi manual beraudit trail.
2. **v1.1.2 — Presensi Mengajar Guru (KBM)**: Integrasi jadwal akademik KBM, delegasi guru inval/pengganti, deteksi grace period keterlambatan, jurnal mengajar mandiri, pencegahan Alpha pada sesi batal.
3. **v1.1.3 — Presensi Pelatih & Realisasi Ekstrakurikuler**: Pembangkitan sesi latihan berkala, substitusi pelatih, input jurnal realisasi & foto dokumentasi, sinkronisasi presensi santri ekskul.
4. **v1.1.4 — Dashboard & Pusat Laporan SDM Terpadu**: Analytics multi-domain independen tanpa skor gabungan semu, visualisasi tren 7-hari grid responsif, 5 kategori laporan (Harian, KBM, Ekskul, KOP Surat, Matriks 360), ekspor CSV UTF-8 BOM.
5. **v1.1.5 — Final Audit, Data Integrity, Regression & Release Gatekeeper**: 16 scanner integritas data, pengesahan UAT 7 peran pemangku kepentingan, uji ketahanan IDOR/BOLA, uji anti-duplicate debounce konkurensi, verifikasi regresi penuh presensi santri.

### Baseline Status
- **Release Candidate**: RC-1.1.5-STABLE
- **Quality Gate**: 0 Blocker, 0 Critical, 0 High Bugs.
- **Acceptance Tests**: 58/58 PASS (100%).
- **Digital Sign-Offs**: 7/7 ACCEPTED (Super Admin, Mudir/Pimpinan, Kepala Sekolah, Kepala Asrama, Petugas, Dewan Guru, Pembina Ekskul).
