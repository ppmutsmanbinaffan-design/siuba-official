<?php

namespace App\Services\Participant;

use App\Models\Activity;
use App\Models\ActivityParticipantRule;
use App\Models\DutyRoster;
use App\Models\EventRegistration;
use App\Models\ExtracurricularMember;
use App\Models\HalaqahMember;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ActivityParticipantResolver
{
    /**
     * Resolves all eligible active students for a given activity and optional date context.
     * Returns an array of items: ['student_id' => int, 'student' => Student, 'sources' => string[]]
     */
    public function resolve(Activity $activity, ?Carbon $date = null): array
    {
        $date = $date ?? now('Asia/Jakarta');
        $rules = ActivityParticipantRule::where('activity_id', $activity->id)
            ->where('is_active', true)
            ->orderBy('priority')
            ->get();

        // If no explicit rules exist, fallback: check if activity has gender or general scope
        if ($rules->isEmpty()) {
            return $this->resolveFallbackDefault($activity);
        }

        $includedStudentIds = []; // student_id => ['student' => Student, 'sources' => []]
        $excludedStudentIds = []; // student_id => true

        foreach ($rules as $rule) {
            $studentsForRule = $this->resolveStudentsByRule($rule, $date);

            if ($rule->rule_operator === 'exclude') {
                foreach ($studentsForRule as $s) {
                    $excludedStudentIds[$s->id] = true;
                }
            } else {
                $sourceLabel = $this->formatSourceLabel($rule);
                foreach ($studentsForRule as $s) {
                    if (!$s->is_active) {
                        continue;
                    }
                    if (!isset($includedStudentIds[$s->id])) {
                        $includedStudentIds[$s->id] = [
                            'student_id' => $s->id,
                            'student' => $s,
                            'sources' => [$sourceLabel],
                            'primary_source' => $rule->rule_type,
                            'primary_source_id' => $rule->source_id,
                        ];
                    } else {
                        $includedStudentIds[$s->id]['sources'][] = $sourceLabel;
                    }
                }
            }
        }

        // Rule Precedence: EXCLUDE beats INCLUDE
        $finalParticipants = [];
        foreach ($includedStudentIds as $id => $data) {
            if (!isset($excludedStudentIds[$id])) {
                $finalParticipants[] = $data;
            }
        }

        return $finalParticipants;
    }

    /**
     * Resolves students matching a specific rule definition.
     */
    protected function resolveStudentsByRule(ActivityParticipantRule $rule, Carbon $date): Collection
    {
        $query = Student::where('is_active', true);

        switch ($rule->rule_type) {
            case 'all_students':
                if (isset($rule->rule_value['gender'])) {
                    $query->where('gender', $rule->rule_value['gender']);
                }
                return $query->get();

            case 'classroom':
                if ($rule->source_id) {
                    $query->where('classroom_id', $rule->source_id);
                } elseif (isset($rule->rule_value['classroom_ids'])) {
                    $query->whereIn('classroom_id', $rule->rule_value['classroom_ids']);
                }
                return $query->get();

            case 'grade_level':
                $grade = $rule->rule_value['grade'] ?? null;
                if ($grade) {
                    $query->whereHas('classroom', function ($q) use ($grade) {
                        $q->where('level', $grade);
                    });
                }
                return $query->get();

            case 'dormitory':
                if ($rule->source_id) {
                    $query->where('dormitory_id', $rule->source_id);
                }
                return $query->get();

            case 'room':
                if ($rule->source_id) {
                    $query->where('dormitory_room_id', $rule->source_id);
                }
                return $query->get();

            case 'halaqah':
                if ($rule->source_id) {
                    $studentIds = HalaqahMember::where('halaqah_id', $rule->source_id)
                        ->where('is_active', true)
                        ->pluck('student_id');
                    return $query->whereIn('id', $studentIds)->get();
                }
                return collect();

            case 'extracurricular':
                if ($rule->source_id) {
                    $studentIds = ExtracurricularMember::where('extracurricular_id', $rule->source_id)
                        ->where('membership_status', 'active')
                        ->where('is_active', true)
                        ->pluck('student_id');
                    return $query->whereIn('id', $studentIds)->get();
                }
                return collect();

            case 'duty_roster':
                $dateStr = $date->toDateString();
                $studentIds = DutyRoster::where('activity_id', $rule->activity_id)
                    ->whereDate('date', $dateStr)
                    ->where('is_active', true)
                    ->pluck('student_id');
                return $query->whereIn('id', $studentIds)->get();

            case 'event_registration':
                $eventId = $rule->source_id ?? ($rule->rule_value['event_id'] ?? null);
                if ($eventId) {
                    $studentIds = EventRegistration::where('event_id', $eventId)
                        ->where('status', 'approved')
                        ->pluck('student_id');
                    return $query->whereIn('id', $studentIds)->get();
                }
                return collect();

            case 'individual':
                $studentIds = $rule->rule_value['student_ids'] ?? ($rule->source_id ? [$rule->source_id] : []);
                return $query->whereIn('id', $studentIds)->get();

            default:
                return collect();
        }
    }

    /**
     * Fallback default when no explicit participant rules are registered.
     */
    protected function resolveFallbackDefault(Activity $activity): array
    {
        $query = Student::where('is_active', true);
        if ($activity->gender) {
            $query->where('gender', $activity->gender);
        }

        $students = $query->get();
        $result = [];
        foreach ($students as $s) {
            $result[] = [
                'student_id' => $s->id,
                'student' => $s,
                'sources' => ['default_activity_scope'],
                'primary_source' => 'activity_default',
                'primary_source_id' => $activity->id,
            ];
        }
        return $result;
    }

    protected function formatSourceLabel(ActivityParticipantRule $rule): string
    {
        return "{$rule->rule_type}:" . ($rule->source_id ?? json_encode($rule->rule_value));
    }
}
