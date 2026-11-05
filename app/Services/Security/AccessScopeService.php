<?php

namespace App\Services\Security;

use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Extracurricular;
use App\Models\Halaqah;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

enum ScopeType: string
{
    case GLOBAL = 'GLOBAL';
    case INSTITUTION = 'INSTITUTION';
    case UNIT = 'UNIT';
    case CLASS = 'CLASS';
    case DORMITORY = 'DORMITORY';
    case ACTIVITY = 'ACTIVITY';
    case SELF = 'SELF';
    case ASSIGNED = 'ASSIGNED';
}

class AccessScopeService
{
    /**
     * Resolves the authoritative scope type for a user on a given resource
     */
    public static function resolveScopeType(?User $user, string $resourceType = 'students'): ScopeType
    {
        if (!$user) {
            return ScopeType::SELF;
        }

        // Super Admin & Administrator have GLOBAL scope
        if ($user->hasRole(['super-admin', 'super_admin', 'admin'])) {
            return ScopeType::GLOBAL;
        }

        // Leaders & Principals have INSTITUTION / UNIT scope
        if ($user->hasRole(['pimpinan', 'kepala-sekolah'])) {
            return ScopeType::INSTITUTION;
        }

        // Boarding leadership & Musyrif have DORMITORY scope
        if ($user->hasRole(['kepala-asrama', 'musyrif'])) {
            return ScopeType::DORMITORY;
        }

        // Teachers & Homeroom teachers have CLASS scope
        if ($user->hasRole(['guru', 'teacher', 'wali-kelas'])) {
            return ScopeType::CLASS;
        }

        // Extracurricular Trainers have ACTIVITY scope
        if ($user->hasRole(['pelatih', 'pembina-ekskul'])) {
            return ScopeType::ACTIVITY;
        }

        // Default to ASSIGNED / SELF
        return ScopeType::ASSIGNED;
    }

    /**
     * Applies backend query scoping to an Eloquent query builder.
     * Prevents cross-tenant / cross-scope data leakage at the query level.
     */
    public static function applyScope(Builder $query, ?User $user, string $resourceType = 'students'): Builder
    {
        if (!$user) {
            return $query->whereRaw('1 = 0'); // Block all
        }

        $scope = self::resolveScopeType($user, $resourceType);

        if ($scope === ScopeType::GLOBAL || $scope === ScopeType::INSTITUTION) {
            return $query; // Full access
        }

        switch ($resourceType) {
            case 'students':
                return self::applyStudentScope($query, $user, $scope);

            case 'attendance_sessions':
                return self::applySessionScope($query, $user, $scope);

            case 'classrooms':
                if ($scope === ScopeType::CLASS) {
                    return $query->where('homeroom_teacher', 'LIKE', '%' . $user->name . '%');
                }
                return $query;

            case 'dormitories':
            case 'dormitory_rooms':
                if ($scope === ScopeType::DORMITORY) {
                    return $query->where('supervisor', 'LIKE', '%' . $user->name . '%');
                }
                return $query;

            case 'extracurriculars':
                if ($scope === ScopeType::ACTIVITY) {
                    return $query->where('coach_id', $user->id);
                }
                return $query;

            default:
                return $query;
        }
    }

    /**
     * Scopes Student query based on user assignment
     */
    protected static function applyStudentScope(Builder $query, User $user, ScopeType $scope): Builder
    {
        if ($scope === ScopeType::DORMITORY) {
            // Musyrif / Asrama: Only students residing in rooms supervised by this user or assigned dormitories
            return $query->whereHas('dormitoryRoom', function ($q) use ($user) {
                $q->where('supervisor', 'LIKE', '%' . $user->name . '%');
            });
        }

        if ($scope === ScopeType::CLASS) {
            // Guru / Wali Kelas: Only students in classes taught or managed by this user
            return $query->whereHas('classroom', function ($q) use ($user) {
                $q->where('homeroom_teacher', 'LIKE', '%' . $user->name . '%');
            });
        }

        if ($scope === ScopeType::ACTIVITY) {
            // Pelatih: Only students enrolled in extracurriculars coached by this user
            return $query->whereHas('extracurricularMembers.extracurricular', function ($q) use ($user) {
                $q->where('coach_id', $user->id);
            });
        }

        return $query;
    }

    /**
     * Scopes AttendanceSession query based on user assignment
     */
    protected static function applySessionScope(Builder $query, User $user, ScopeType $scope): Builder
    {
        if ($scope === ScopeType::CLASS) {
            // Guru: Only sessions where user is teacher, substitute, or homeroom teacher
            return $query->where(function ($q) use ($user) {
                $q->where('teacher_id', $user->id)
                  ->orWhere('creator_id', $user->id);
            });
        }

        if ($scope === ScopeType::DORMITORY) {
            // Musyrif: Only boarding & routine sessions
            return $query->whereHas('activity', function ($q) {
                $q->whereIn('category_code', ['ASRAMA', 'IBADAH', 'TAHFIDZ', 'KEBERSIHAN']);
            });
        }

        if ($scope === ScopeType::ACTIVITY) {
            // Pelatih: Only extracurricular sessions
            return $query->whereHas('activity', function ($q) {
                $q->where('category_code', 'EKSTRAKURIKULER');
            });
        }

        return $query;
    }

    /**
     * IDOR (Insecure Direct Object Reference) Protection.
     * Throws 403 Forbidden if user tries to access a specific model instance outside their scope.
     */
    public static function authorizeAccess(?User $user, Model $model, string $action = 'view'): void
    {
        if (!$user) {
            throw new AccessDeniedHttpException('Akses ditolak: Pengguna belum terautentikasi.');
        }

        if ($user->hasRole(['super-admin', 'super_admin', 'admin', 'pimpinan'])) {
            return; // Authorized
        }

        if ($model instanceof Student) {
            $scope = self::resolveScopeType($user, 'students');
            if ($scope === ScopeType::DORMITORY) {
                $room = $model->dormitoryRoom;
                if ($room && !str_contains(strtolower($room->supervisor), strtolower($user->name))) {
                    throw new AccessDeniedHttpException('Akses Ditolak (403): Santri berada di luar asrama/binaan Anda.');
                }
            } elseif ($scope === ScopeType::CLASS) {
                $class = $model->classroom;
                if ($class && !str_contains(strtolower($class->homeroom_teacher), strtolower($user->name))) {
                    throw new AccessDeniedHttpException('Akses Ditolak (403): Santri berada di luar kelas binaan Anda.');
                }
            }
        } elseif ($model instanceof AttendanceSession) {
            $scope = self::resolveScopeType($user, 'attendance_sessions');
            if ($scope === ScopeType::CLASS && $model->teacher_id && $model->teacher_id !== $user->id) {
                throw new AccessDeniedHttpException('Akses Ditolak (403): Sesi KBM ini bukan jadwal mengajar Anda.');
            }
        }
    }
}
