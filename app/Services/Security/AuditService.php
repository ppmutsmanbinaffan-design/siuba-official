<?php

namespace App\Services\Security;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Forbidden fields that must NEVER be recorded in audit trail logs.
     */
    protected static array $redactedKeys = [
        'password',
        'password_hash',
        'app_key',
        'device_secret',
        'db_password',
        'authorization',
        'wifi_password',
        'secret',
        'token',
        'remember_token',
        'api_key',
    ];

    /**
     * Record a secure global audit log entry.
     */
    public static function log(
        string $event,
        ?string $auditableType = null,
        ?int $auditableId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $reason = null,
        ?int $userId = null,
        ?int $deviceId = null,
        ?string $clientInstallationId = null
    ): AuditLog {
        $redactedOld = $oldValues ? self::redactSensitiveData($oldValues) : null;
        $redactedNew = $newValues ? self::redactSensitiveData($newValues) : null;

        $ip = Request::ip() ?? '127.0.0.1';
        $ua = substr(Request::userAgent() ?? 'System / CLI', 0, 255);

        return AuditLog::create([
            'user_id' => $userId ?? auth()->id(),
            'attendance_device_id' => $deviceId,
            'client_installation_id' => $clientInstallationId,
            'event' => $event,
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'old_values' => $redactedOld,
            'new_values' => $redactedNew,
            'reason' => $reason,
            'ip_address' => $ip,
            'user_agent_summary' => $ua,
            'created_at' => now(),
        ]);
    }

    /**
     * Recursively redact sensitive security values from audit state dictionaries.
     */
    public static function redactSensitiveData(array $data): array
    {
        $cleaned = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string)$key);
            $isSensitive = false;
            foreach (self::$redactedKeys as $redacted) {
                if (str_contains($lowerKey, $redacted)) {
                    $isSensitive = true;
                    break;
                }
            }

            if ($isSensitive) {
                $cleaned[$key] = '[REDACTED_FOR_SECURITY]';
            } elseif (is_array($value)) {
                $cleaned[$key] = self::redactSensitiveData($value);
            } else {
                $cleaned[$key] = $value;
            }
        }
        return $cleaned;
    }
}
