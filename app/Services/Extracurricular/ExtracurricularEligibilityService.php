<?php

namespace App\Services\Extracurricular;

use App\Models\Extracurricular;
use App\Models\ExtracurricularMember;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ExtracurricularEligibilityService
{
    /**
     * Check if a student is eligible to join an extracurricular activity.
     */
    public function checkEligibility(Extracurricular $extra, Student $student): array
    {
        if (!$student->is_active) {
            return ['eligible' => false, 'reason' => 'Santri tidak aktif.'];
        }

        $now = now('Asia/Jakarta');
        if ($extra->registration_open_at && $now->lessThan($extra->registration_open_at)) {
            return ['eligible' => false, 'reason' => 'Pendaftaran belum dibuka.'];
        }

        if ($extra->registration_close_at && $now->greaterThan($extra->registration_close_at)) {
            return ['eligible' => false, 'reason' => 'Pendaftaran telah ditutup.'];
        }

        // Check already registered
        $existing = ExtracurricularMember::where('extracurricular_id', $extra->id)
            ->where('student_id', $student->id)
            ->where('is_active', true)
            ->first();

        if ($existing) {
            return ['eligible' => false, 'reason' => "Santri sudah terdaftar dengan status: {$existing->membership_status}."];
        }

        // Check capacity
        $activeCount = ExtracurricularMember::where('extracurricular_id', $extra->id)
            ->where('membership_status', 'active')
            ->where('is_active', true)
            ->count();

        $isFull = $extra->capacity && $activeCount >= $extra->capacity;

        if ($isFull && !$extra->waitlist_enabled) {
            return ['eligible' => false, 'reason' => 'Kapasitas penuh dan daftar tunggu tidak diaktifkan.'];
        }

        return [
            'eligible' => true,
            'is_full' => $isFull,
            'target_status' => $isFull ? 'waitlisted' : ($extra->approval_required ? 'pending' : 'active'),
        ];
    }

    /**
     * Register a student atomically into extracurricular.
     */
    public function register(Extracurricular $extra, Student $student, ?string $notes = null): ExtracurricularMember
    {
        return DB::transaction(function () use ($extra, $student, $notes) {
            $eligibility = $this->checkEligibility($extra, $student);
            if (!$eligibility['eligible']) {
                throw new InvalidArgumentException($eligibility['reason']);
            }

            return ExtracurricularMember::create([
                'extracurricular_id' => $extra->id,
                'student_id' => $student->id,
                'membership_status' => $eligibility['target_status'],
                'joined_at' => now('Asia/Jakarta'),
                'registration_source' => 'system',
                'notes' => $notes,
                'is_active' => true,
            ]);
        });
    }

    /**
     * Promote the next waitlisted member atomically when an active slot is freed.
     */
    public function promoteNextWaitlisted(Extracurricular $extra): ?ExtracurricularMember
    {
        return DB::transaction(function () use ($extra) {
            $activeCount = ExtracurricularMember::where('extracurricular_id', $extra->id)
                ->where('membership_status', 'active')
                ->where('is_active', true)
                ->count();

            if ($extra->capacity && $activeCount >= $extra->capacity) {
                return null;
            }

            $next = ExtracurricularMember::where('extracurricular_id', $extra->id)
                ->where('membership_status', 'waitlisted')
                ->where('is_active', true)
                ->orderBy('joined_at')
                ->first();

            if ($next) {
                $next->update([
                    'membership_status' => 'active',
                    'approved_at' => now('Asia/Jakarta'),
                ]);
            }

            return $next;
        });
    }
}
