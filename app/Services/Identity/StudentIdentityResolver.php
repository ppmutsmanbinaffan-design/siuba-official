<?php

namespace App\Services\Identity;

use App\Models\Student;

class StudentIdentityResolver
{
    /**
     * Resolve active student by exact QR Token.
     */
    public function resolveByQrToken(string $token): ?Student
    {
        $cleanToken = trim($token);
        if (empty($cleanToken)) {
            return null;
        }

        return Student::where('qr_token', $cleanToken)->first();
    }

    /**
     * Normalize and resolve active student by RFID UID.
     */
    public function resolveByRfidUid(string $rawUid): ?Student
    {
        $normalized = $this->normalizeRfidUid($rawUid);
        if ($normalized === null) {
            return null;
        }

        return Student::where('rfid_uid', $normalized)->first();
    }

    /**
     * Clean raw RFID input (strip non-alphanumeric, uppercase, trim).
     */
    public function normalizeRfidUid(?string $rawUid): ?string
    {
        if ($rawUid === null || trim($rawUid) === '') {
            return null;
        }

        $cleaned = preg_replace('/[^A-Za-z0-9]/', '', $rawUid);
        if (empty($cleaned)) {
            return null;
        }

        return strtoupper($cleaned);
    }
}
