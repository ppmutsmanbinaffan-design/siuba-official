# Changelog — SIUBA Modul Presensi Santri

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.5] - 2026-08-25
### Added
- **Final Audit & Data Integrity Suite**: 16 comprehensive data integrity checks verifying Single Staff Master uniqueness (0 duplicate staff numbers, 0 duplicate QR tokens, 0 duplicate RFID UIDs), orphan profile elimination, and automated repair triggers.
- **Multi-Role UAT Matrix & Digital Sign-Offs**: 7 operational roles (Super Admin/IT, Pimpinan Mudir, Kepala Sekolah, Kepala Asrama, Petugas Lapangan, Dewan Guru, Pembina Ekskul) with cryptographic SHA-256 signatures.
- **Cross-Domain Reconciliation**: 100% strict mathematical equality across Dashboard Daily/Teaching/Training, Central Report Query, 360 Dossier, and RFC4180 UTF-8 BOM CSV exports.
- **Release Gatekeeper Enforcement**: Quality baseline verifying 0 Blocker and 0 Critical open bugs, with 58 automated acceptance tests and full student attendance regression.

## [1.1.4] - 2026-08-25
### Added
- **Integrated Staff Analytics & Reporting Center**: Multi-domain analytical aggregation across Daily Presence, Teaching Realization, and Training Realization with role-based scoping.
- **Custom 7-Day Responsive Trend Visualizer**: Ultra-fast grid-based visual attendance trends with no external charting bloatware.
- **Pusat Laporan SDM Terpadu**: 5 comprehensive reporting tabs (Daily Recap, Teaching KBM Recap, Training Recap, Dossier Matriks 360, Official Letterhead Printout).

## [1.1.3] - 2026-08-25
### Added
- **Presensi Pelatih & Ekstrakurikuler Engine**: Training session generator, trainer substitution management, realization journals with documentation, and student-trainer consistency validation.

## [1.1.2] - 2026-08-25
### Added
- **Presensi Mengajar Guru (KBM) Engine**: Academic teaching session generator, teacher inval substitution, grace period tolerance, and lesson journals.

## [1.1.1] - 2026-08-25
### Added
- **Master SDM & Presensi Harian Pegawai**: Dedicated staff master, individual/shift work schedule resolution, RFID/QR staff terminal mode, and audit-logged manual corrections.

## [1.0.0] - 2026-08-24
### Added
- Single Unified Attendance Engine for Manual, QR, and RFID capture methods.
- Dynamic Participant Engine resolving snapshot rules for Academic, Routine, Prayer, Boarding, Halaqah, Extracurricular, and Events.
- Real PWA Offline mode with IndexedDB local caching and Idempotent Sync queue.
- Executive Dashboard, Daily Activity Timeline, and Comprehensive Matrix Reporting.
- Disaster Recovery and Automated Backup system with SHA256 integrity checks.
- Hardware integration support for ESP32 RFID readers and Live QR camera scanning.
- Spatie-compatible Role-Based Access Control and immutable Audit Trail.
- Full Operational SOPs, Role User Guides, and Troubleshooting Manuals.

### Fixed
- Defensive array handling across all analytical and monitoring UI views.
- Zero duplicate race condition protection with unique session-student constraints.
