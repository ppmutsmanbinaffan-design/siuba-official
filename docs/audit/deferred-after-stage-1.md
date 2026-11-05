# SIUBA Audit — Deferred Tasks (Post-Stage 1)

## Overview
This document records architectural items, optional features, and secondary modules deliberately scheduled for subsequent implementation stages (Tahap 2+) after Stage 1 (Core Attendance Engine, Laravel 12 Foundation & Participant Snapshot Hardening) is verified.

## 1. Hardware Integration & IoT Gateways (Tahap 2)
- **MQTT / WebSocket Broker for Physical RFID Gates**: ESP32 / Arduino hardware firmware integration with local MQTT bridge.
- **Biometric Device SDKs**: Fingerprint scanner (ZKTeco / Suprema) push SDK integration.
- **Face Recognition Stream**: RTSP camera stream frame extraction and edge inference integration.

## 2. Parent Communications & Notifications (Tahap 2)
- **WhatsApp Gateway Integration**: Asynchronous dispatch of attendance notifications via Fonnte / Wablas API with queue failover.
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration for Mobile Wali Santri application.

## 3. Advanced Academic & Disciplinary Automation (Tahap 3)
- **Automated Absence Scoring**: Scheduled cron job to transition unrecorded participants to `ABSENT` (Alpha) upon session closing.
- **Disciplinary Violation Thresholds**: Automatic trigger of Surat Peringatan (SP) upon accumulating threshold of unexcused absences.
- **Tahfidz Quran Verse Log**: Detailed surah and ayah recitation tracking tied to Halaqah attendance sessions.

## 4. Multi-Branch & Cloud Synchronization (Tahap 4)
- **Multi-Tenant / Multi-Campus Partitioning**: Multi-branch support with branch-isolated data scoping.
- **Local SQLite to Cloud MySQL Two-Way Replication**: Conflict-free replicated data types (CRDT) for distributed offline nodes.
