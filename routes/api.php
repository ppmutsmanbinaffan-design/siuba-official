<?php

use App\Http\Controllers\Api\AnalyticsApiController;
use App\Http\Controllers\Api\AttendanceApiController;
use App\Http\Controllers\Api\AttendanceSessionApiController;
use App\Http\Controllers\Api\MasterDataApiController;
use App\Http\Controllers\Api\StudentApiController;
use App\Http\Controllers\Api\StaffApiController;
use App\Http\Controllers\Api\AcademicApiController;
use App\Http\Controllers\Api\StudentExcusalApiController;
use App\Http\Controllers\Api\StaffAttendanceApiController;
use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\DataImportApiController;
use App\Http\Controllers\Api\DeviceManagementApiController;
use App\Http\Controllers\Api\CommunityApiController;
use App\Http\Controllers\Api\RoutineApiController;
use App\Http\Controllers\Api\AppSettingsApiController;
use App\Http\Controllers\Api\SystemBackupApiController;
use App\Http\Controllers\Api\ReportDatasetApiController;
use App\Http\Controllers\Api\TrainerApiController;
use App\Http\Controllers\Api\DomainManagementApiController;
use App\Http\Controllers\Api\IotDeviceApiController;
use App\Http\Controllers\Api\LandingCmsApiController;
use App\Http\Controllers\Api\LocalDataMigrationApiController;
use App\Http\Controllers\Api\MaintenanceApiController;
use App\Http\Controllers\Api\OfflineSyncApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - SIUBA Core Engine, Analytics, Reporting & Offline Sync API
|--------------------------------------------------------------------------
*/

// Server Health Endpoints (Public)
Route::get('/health', [OfflineSyncApiController::class, 'health']);
Route::get('/v1/health', [OfflineSyncApiController::class, 'health']);

// Top-level Auth Login (Rate Limited: 5 attempts per minute)
Route::post('/login', [AuthApiController::class, 'login'])->middleware('throttle:5,1')->name('login');

Route::prefix('v1')->group(function () {
    // Health Check (Public)
    Route::get('/health', [OfflineSyncApiController::class, 'health']);

    // Authentication Public & User Credential Endpoints
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthApiController::class, 'login'])->middleware('throttle:5,1');

        // Authenticated Session Endpoints
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthApiController::class, 'me']);
            Route::post('/logout', [AuthApiController::class, 'logout']);
        });
    });

    // User List for System Shell (requires login + users.view; previously public and leaked emails/roles)
    Route::get('/users', [AuthApiController::class, 'listUsers'])
        ->middleware(['auth:sanctum', 'permission:users.view']);

    // =========================================================================
    // PROTECTED OPERATIONAL API GROUP (Requires valid Sanctum Bearer Token)
    // =========================================================================
    Route::middleware('auth:sanctum')->group(function () {

        // User Management, Role Assignment & Password Sync (Protected)
        Route::post('/users/{id}/password', [AuthApiController::class, 'updatePassword'])
            ->middleware('permission:users.update');
        Route::put('/users/{id}', [AuthApiController::class, 'updateUser'])
            ->middleware('permission:users.update');
        Route::post('/users', [AuthApiController::class, 'createUser'])
            ->middleware('permission:users.create');
        Route::delete('/users/{id}', [AuthApiController::class, 'deleteUser'])
            ->middleware('permission:users.delete');
        Route::match(['post', 'put'], '/users/{id}/roles', [AuthApiController::class, 'assignRoles'])
            ->middleware('role:super-admin');
        Route::get('/roles', [AuthApiController::class, 'listRoles'])
            ->middleware('permission:users.view');

        // Full-Stack Bulk Import Engine (Santri, Guru, SDM, Pelatih)
        Route::prefix('import')->group(function () {
            // Students Import
            Route::get('/students/template', [DataImportApiController::class, 'downloadStudentTemplate']);
            Route::post('/students/preview', [DataImportApiController::class, 'previewStudents'])
                ->middleware('permission:students.create|students.update');
            Route::post('/students', [DataImportApiController::class, 'importStudents'])
                ->middleware('permission:students.create|students.update');

            // Staff / Teachers / Coaches Import
            Route::get('/staff/template', [DataImportApiController::class, 'downloadStaffTemplate']);
            Route::post('/staff/preview', [DataImportApiController::class, 'previewStaff'])
                ->middleware('permission:staff.create|staff.edit|users.create');
            Route::post('/staff', [DataImportApiController::class, 'importStaff'])
                ->middleware('permission:staff.create|staff.edit|users.create');
        });

        // Master Data Santri (aplikasi React - sebelumnya hanya localStorage)
        Route::get('/students', [StudentApiController::class, 'index'])->middleware('permission:students.view');
        Route::get('/students/{student}', [StudentApiController::class, 'show'])->middleware('permission:students.view');
        Route::post('/students', [StudentApiController::class, 'store'])->middleware('permission:students.create');
        Route::match(['put', 'patch'], '/students/{student}', [StudentApiController::class, 'update'])
            ->middleware('permission:students.update|students.edit|students.deactivate');
        Route::delete('/students/{student}', [StudentApiController::class, 'destroy'])->middleware('permission:students.delete');

        // Master Data SDM (guru, pelatih, musyrif, staf)
        Route::get('/staff', [StaffApiController::class, 'index'])->middleware('permission:staff.view');
        Route::get('/staff/{staff}', [StaffApiController::class, 'show'])->middleware('permission:staff.view');
        Route::post('/staff', [StaffApiController::class, 'store'])->middleware('permission:staff.create');
        Route::match(['put', 'patch'], '/staff/{staff}', [StaffApiController::class, 'update'])->middleware('permission:staff.edit|staff.deactivate');
        Route::post('/staff/{staff}/regenerate-qr', [StaffApiController::class, 'regenerateQr'])->middleware('permission:staff.edit');

        // Izin / sakit / dispensasi santri
        Route::get('/student-excusals', [StudentExcusalApiController::class, 'index'])->middleware('permission:attendance.excuses|attendance.view|attendance.monitoring');
        Route::post('/student-excusals', [StudentExcusalApiController::class, 'store'])->middleware('permission:attendance.excuses|attendance.manual');
        Route::post('/student-excusals/{excusal}/approve', [StudentExcusalApiController::class, 'approve'])->middleware('permission:attendance.excuses');
        Route::post('/student-excusals/{excusal}/reject', [StudentExcusalApiController::class, 'reject'])->middleware('permission:attendance.excuses');
        Route::post('/student-excusals/{excusal}/cancel', [StudentExcusalApiController::class, 'cancel'])->middleware('permission:attendance.excuses');

        // Presensi harian SDM & pengajuan izin SDM
        Route::prefix('staff-attendance')->group(function () {
            Route::get('/daily', [StaffAttendanceApiController::class, 'daily'])->middleware('permission:staff.attendance|staff.reports|staff.view');
            Route::get('/daily/summary', [StaffAttendanceApiController::class, 'summary'])->middleware('permission:staff.attendance|staff.reports|staff.view');
            Route::post('/daily/scan', [StaffAttendanceApiController::class, 'scan'])->middleware('permission:staff.attendance');
            Route::post('/daily/manual', [StaffAttendanceApiController::class, 'manual'])->middleware('permission:staff.attendance');
            Route::post('/daily/finalize', [StaffAttendanceApiController::class, 'finalize'])->middleware('permission:staff.edit|staff.reports');
            Route::get('/work-schedule', [StaffAttendanceApiController::class, 'workSchedule'])->middleware('permission:staff.attendance|staff.reports|staff.view');
            Route::put('/work-schedule', [StaffAttendanceApiController::class, 'updateWorkSchedule'])->middleware('permission:staff.edit|system.settings');
            Route::post('/records/{record}/correct', [StaffAttendanceApiController::class, 'correct'])->middleware('permission:staff.attendance|staff.edit');
            Route::get('/absences', [StaffAttendanceApiController::class, 'absences'])->middleware('permission:staff.attendance|staff.reports|staff.view');
            Route::post('/absences', [StaffAttendanceApiController::class, 'storeAbsence'])->middleware('permission:staff.attendance');
            Route::post('/absences/{absence}/approve', [StaffAttendanceApiController::class, 'approveAbsence'])->middleware('permission:staff.edit|staff.deactivate');
            Route::post('/absences/{absence}/reject', [StaffAttendanceApiController::class, 'rejectAbsence'])->middleware('permission:staff.edit|staff.deactivate');
        });

        // Master kegiatan, jadwal rutin, kalender shalat, penanggung jawab, generate sesi rutin
        Route::get('/routine-master', [RoutineApiController::class, 'master'])
            ->middleware('permission:activities.view|routine.view|routine_schedule.view|attendance.view|attendance.sessions.view');
        Route::post('/activities', [RoutineApiController::class, 'storeActivity'])->middleware('permission:activities.create');
        Route::put('/activities/{activity}', [RoutineApiController::class, 'updateActivity'])->middleware('permission:activities.update');
        Route::delete('/activities/{activity}', [RoutineApiController::class, 'deleteActivity'])->middleware('permission:activities.delete');
        Route::put('/routine-schedules/sync', [RoutineApiController::class, 'sync'])->middleware('permission:routine_schedule.manage');
        Route::post('/routine-schedules/generate', [RoutineApiController::class, 'generate'])->middleware('permission:attendance.sessions.create|routine_schedule.manage');
        Route::post('/attendance/sessions', [RoutineApiController::class, 'storeSession'])->middleware('permission:attendance.sessions.create');

        // Pengaturan sistem (identitas lembaga, aturan absensi, desain kartu, info server)
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogApiController::class, 'index'])->middleware('permission:system.security_audit');
        Route::get('/settings', [AppSettingsApiController::class, 'index']);
        Route::get('/settings/card-templates', [AppSettingsApiController::class, 'cardTemplates']);
        Route::put('/settings/card-templates', [AppSettingsApiController::class, 'saveCardTemplates'])->middleware('permission:students.cards|system.settings');
        Route::middleware('permission:system.settings')->group(function () {
            Route::get('/settings/system-info', [AppSettingsApiController::class, 'systemInfo']);
            Route::post('/settings/clear-cache', [AppSettingsApiController::class, 'clearCache']);
            Route::put('/settings/{key}', [AppSettingsApiController::class, 'update'])->where('key', 'institution|attendance');
        });
        Route::put('/settings/security', [AppSettingsApiController::class, 'updateSecurity'])->middleware('permission:system.security_audit');

        // Data laporan SDM (harian, mengajar, melatih, izin) untuk rentang tanggal
        Route::get('/reports/staff-dataset', [ReportDatasetApiController::class, 'staff'])
            ->middleware('permission:staff.reports|kbm.reports|reports.view|trainer.attendance');

        // Presensi mengajar guru per jam pelajaran (KBM) — tahap 19
        Route::prefix('teaching')->group(function () {
            $teachView = 'permission:kbm.monitoring|kbm.teacher_dashboard|kbm.reports|kbm.master|staff.attendance|staff.reports';
            $teachRecord = 'permission:kbm.monitoring|kbm.teacher_dashboard|staff.attendance';
            Route::get('/sessions', [\App\Http\Controllers\Api\TeachingApiController::class, 'sessions'])->middleware($teachView);
            Route::get('/sessions/{session}', [\App\Http\Controllers\Api\TeachingApiController::class, 'show'])->whereNumber('session')->middleware($teachView);
            Route::get('/substitutions', [\App\Http\Controllers\Api\TeachingApiController::class, 'substitutions'])->middleware($teachView);
            Route::post('/scan', [\App\Http\Controllers\Api\TeachingApiController::class, 'scan'])->middleware($teachRecord);
            Route::post('/sessions/{session}/manual', [\App\Http\Controllers\Api\TeachingApiController::class, 'manual'])->whereNumber('session')->middleware($teachRecord);
            Route::post('/sessions/{session}/journal', [\App\Http\Controllers\Api\TeachingApiController::class, 'journal'])->whereNumber('session')->middleware($teachRecord);
            Route::post('/finalize', [\App\Http\Controllers\Api\TeachingApiController::class, 'finalize'])->middleware('permission:kbm.monitoring|staff.attendance|staff.edit');
            Route::post('/substitutions', [\App\Http\Controllers\Api\TeachingApiController::class, 'substitute'])->middleware('permission:kbm.master|kbm.monitoring');
        });

        // Presensi pembina / pelatih ekstrakurikuler
        Route::prefix('trainer')->group(function () {
            Route::get('/overview', [TrainerApiController::class, 'overview'])
                ->middleware('permission:trainer.attendance|extracurriculars.view|extracurriculars.manage|staff.attendance|staff.reports');
            Route::post('/scan', [TrainerApiController::class, 'scan'])->middleware('permission:trainer.attendance|staff.attendance|extracurriculars.manage');
            Route::post('/sessions/{session}/journal', [TrainerApiController::class, 'journal'])->middleware('permission:trainer.attendance|extracurriculars.manage');
            Route::middleware('permission:extracurriculars.manage|staff.edit')->group(function () {
                Route::post('/generate', [TrainerApiController::class, 'generate']);
                Route::post('/finalize', [TrainerApiController::class, 'finalize']);
                Route::post('/schedules', [TrainerApiController::class, 'storeSchedule']);
                Route::delete('/schedules/{schedule}', [TrainerApiController::class, 'deleteSchedule']);
                Route::post('/assignments', [TrainerApiController::class, 'storeAssignment']);
                Route::delete('/assignments/{assignment}', [TrainerApiController::class, 'deleteAssignment']);
                Route::post('/substitutions', [TrainerApiController::class, 'storeSubstitution']);
                Route::delete('/substitutions/{substitution}', [TrainerApiController::class, 'cancelSubstitution']);
            });
        });

        // Ekstrakurikuler, halaqah, piket, dan event khusus
        Route::prefix('community')->group(function () {
            Route::get('/master', [CommunityApiController::class, 'master'])
                ->middleware('permission:extracurriculars.view|halaqah.view|duty_roster.view|events.view|trainer.attendance|attendance.sessions.view');

            Route::middleware('permission:extracurriculars.manage')->group(function () {
                Route::post('/extracurriculars', [CommunityApiController::class, 'storeEkskul']);
                Route::put('/extracurriculars/{ekskul}', [CommunityApiController::class, 'updateEkskul']);
                Route::post('/extracurriculars/{ekskul}/members', [CommunityApiController::class, 'addEkskulMember']);
                Route::delete('/extracurricular-members/{member}', [CommunityApiController::class, 'removeEkskulMember']);
                Route::post('/student-groups', [CommunityApiController::class, 'storeGroup']);
                Route::post('/student-groups/{group}/members', [CommunityApiController::class, 'addGroupMember']);
                Route::delete('/student-group-members/{member}', [CommunityApiController::class, 'removeGroupMember']);
            });

            Route::put('/halaqahs', [CommunityApiController::class, 'syncHalaqahs'])->middleware('permission:halaqah.manage');
            Route::put('/duty-rosters', [CommunityApiController::class, 'syncDutyRosters'])->middleware('permission:duty_roster.manage');

            Route::middleware('permission:events.manage')->group(function () {
                Route::post('/events', [CommunityApiController::class, 'storeEvent']);
                Route::post('/events/{event}/status', [CommunityApiController::class, 'updateEventStatus']);
                Route::post('/events/{event}/sessions', [CommunityApiController::class, 'storeEventSession']);
                Route::post('/events/{event}/registrations', [CommunityApiController::class, 'storeRegistration']);
                Route::post('/event-registrations/{registration}/status', [CommunityApiController::class, 'updateRegistrationStatus']);
                Route::post('/events/{event}/rules', [CommunityApiController::class, 'storeRule']);
                Route::delete('/event-rules/{rule}', [CommunityApiController::class, 'deleteRule']);
            });
        });

        // KBM: mapel, guru, jam pelajaran, penugasan, jadwal, kalender, guru pengganti
        Route::prefix('academic')->group(function () {
            $kbmView = 'permission:kbm.master|kbm.timetable|kbm.monitoring|kbm.teacher_dashboard|kbm.reports';
            Route::get('/master', [AcademicApiController::class, 'master'])->middleware($kbmView);
            Route::middleware('permission:kbm.master')->group(function () {
                Route::post('/subjects', [AcademicApiController::class, 'storeSubject']);
                Route::match(['put', 'patch'], '/subjects/{subject}', [AcademicApiController::class, 'updateSubject']);
                Route::delete('/subjects/{subject}', [AcademicApiController::class, 'deleteSubject']);
                Route::post('/teachers', [AcademicApiController::class, 'storeTeacher']);
                Route::match(['put', 'patch'], '/teachers/{teacher}', [AcademicApiController::class, 'updateTeacher']);
                Route::delete('/teachers/{teacher}', [AcademicApiController::class, 'deactivateTeacher']);
                Route::post('/assignments', [AcademicApiController::class, 'storeAssignment']);
                Route::delete('/assignments/{assignment}', [AcademicApiController::class, 'deleteAssignment']);
                Route::post('/calendar-events', [AcademicApiController::class, 'storeEvent']);
                Route::delete('/calendar-events/{event}', [AcademicApiController::class, 'deleteEvent']);
            });
            Route::middleware('permission:kbm.master|kbm.timetable')->group(function () {
                Route::post('/lesson-periods', [AcademicApiController::class, 'storePeriod']);
                Route::match(['put', 'patch'], '/lesson-periods/{period}', [AcademicApiController::class, 'updatePeriod']);
                Route::delete('/lesson-periods/{period}', [AcademicApiController::class, 'deletePeriod']);
                Route::post('/schedules', [AcademicApiController::class, 'storeSchedule']);
                Route::delete('/schedules/{schedule}', [AcademicApiController::class, 'deleteSchedule']);
            });
            Route::post('/generate', [AcademicApiController::class, 'generate'])->middleware('permission:kbm.master|kbm.timetable|attendance.sessions.create');
            Route::post('/substitutions', [AcademicApiController::class, 'storeSubstitution'])->middleware('permission:kbm.master|kbm.monitoring');
        });

        // Referensi kelas, asrama, kamar (dibutuhkan semua pengguna yang login)
        Route::get('/classrooms', [MasterDataApiController::class, 'classrooms']);
        Route::get('/dormitories', [MasterDataApiController::class, 'dormitories']);
        Route::get('/dormitory-rooms', [MasterDataApiController::class, 'dormitoryRooms']);
        Route::middleware('permission:classrooms.manage')->group(function () {
            Route::post('/classrooms', [MasterDataApiController::class, 'storeClassroom']);
            Route::put('/classrooms/{classroom}', [MasterDataApiController::class, 'updateClassroom']);
            Route::delete('/classrooms/{classroom}', [MasterDataApiController::class, 'deleteClassroom']);
        });
        Route::middleware('permission:dormitory.manage')->group(function () {
            Route::post('/dormitories', [MasterDataApiController::class, 'storeDormitory']);
            Route::put('/dormitories/{dormitory}', [MasterDataApiController::class, 'updateDormitory']);
            Route::delete('/dormitories/{dormitory}', [MasterDataApiController::class, 'deleteDormitory']);
            Route::post('/dormitory-rooms', [MasterDataApiController::class, 'storeRoom']);
            Route::put('/dormitory-rooms/{room}', [MasterDataApiController::class, 'updateRoom']);
            Route::delete('/dormitory-rooms/{room}', [MasterDataApiController::class, 'deleteRoom']);
        });

        // Sesi absensi (aplikasi React)
        Route::prefix('attendance')->group(function () {
            $view = 'permission:attendance.view|attendance.sessions.view|attendance.monitoring';
            Route::get('/sessions', [AttendanceSessionApiController::class, 'index'])->middleware($view);
            Route::get('/kpi', [AttendanceSessionApiController::class, 'kpi'])->middleware($view);
            Route::get('/monitoring', [AttendanceSessionApiController::class, 'monitoring'])->middleware($view);
            Route::get('/sessions/{session}', [AttendanceSessionApiController::class, 'show'])->middleware($view);
            Route::get('/sessions/{session}/participants', [AttendanceSessionApiController::class, 'participants'])->middleware($view);
            Route::get('/sessions/{session}/records', [AttendanceSessionApiController::class, 'records'])->middleware($view);
            Route::post('/sessions/{session}/open', [AttendanceSessionApiController::class, 'open'])->middleware('permission:attendance.sessions.open');
            Route::post('/sessions/{session}/close', [AttendanceSessionApiController::class, 'close'])->middleware('permission:attendance.sessions.close');
            Route::post('/sessions/{session}/cancel', [AttendanceSessionApiController::class, 'cancel'])->middleware('permission:attendance.sessions.close');
            Route::post('/sessions/{session}/manual', [AttendanceSessionApiController::class, 'manual'])->middleware('permission:attendance.manual|attendance.create');
            Route::post('/sessions/{session}/manual-bulk', [AttendanceSessionApiController::class, 'manualBulk'])->middleware('permission:attendance.manual|attendance.create');
            Route::post('/records/{record}/correct', [AttendanceSessionApiController::class, 'correct'])->middleware('permission:attendance.update');
            Route::get('/snapshot', [AttendanceSessionApiController::class, 'snapshot'])->middleware($view);

            // Perangkat RFID (bentuk data untuk aplikasi React)
            Route::get('/devices', [DeviceManagementApiController::class, 'spaIndex'])->middleware('permission:devices.view|devices.manage|attendance.monitoring');
            Route::get('/device-logs', [DeviceManagementApiController::class, 'spaLogs'])->middleware('permission:devices.view|devices.manage|attendance.monitoring');
            Route::get('/devices/logs', [DeviceManagementApiController::class, 'logs'])->middleware('permission:devices.view|devices.manage');
            Route::get('/devices/{device}/logs', [DeviceManagementApiController::class, 'logs'])->middleware('permission:devices.view|devices.manage');
        });

        // Attendance Core Engine Endpoints
        Route::prefix('attendance')->group(function () {
            Route::post('/sessions/{session}/record', [AttendanceApiController::class, 'record'])
                ->middleware('permission:attendance.create|attendance.manual');
            Route::post('/sessions/{session}/qr', [AttendanceApiController::class, 'recordByQr'])
                ->middleware('permission:attendance.create|attendance.qr');
            Route::get('/sessions/{session}/stats', [AttendanceApiController::class, 'sessionStats'])
                ->middleware('permission:attendance.view|attendance.sessions.view');
        });

        // Offline Sync & Preparation Endpoints (Sprint 10)
        Route::prefix('offline')->group(function () {
            Route::get('/prepare-session/{session}', [OfflineSyncApiController::class, 'prepareSession'])
                ->middleware('permission:system.sync_center|attendance.sessions.view');
            Route::post('/attendance/sync', [OfflineSyncApiController::class, 'sync'])
                ->middleware('permission:system.sync_center|attendance.create');
        });

        // Analytics & Realtime KPIs (Sprint 9)
        Route::prefix('analytics')->group(function () {
            Route::get('/dashboard', [AnalyticsApiController::class, 'dashboard'])
                ->middleware('permission:dashboard.view|dashboard.executive');
            Route::get('/students/{student}', [AnalyticsApiController::class, 'studentAnalytics'])
                ->middleware('permission:students.view');
            Route::get('/classrooms/{classroom}', [AnalyticsApiController::class, 'classroomAnalytics'])
                ->middleware('permission:classrooms.view|reports.view');
            Route::get('/prayers', [AnalyticsApiController::class, 'prayerAnalytics'])
                ->middleware('permission:prayer.view|prayer.monitoring');
            Route::get('/devices', [AnalyticsApiController::class, 'deviceAnalytics'])
                ->middleware('permission:devices.view');
        });

        // Reporting Suite & Exports
        Route::prefix('reports')->group(function () {
            Route::get('/daily', [AnalyticsApiController::class, 'dailyReport'])
                ->middleware('permission:reports.view|reports.attendance.view');
            Route::get('/daily/export', [AnalyticsApiController::class, 'exportDailyCsv'])
                ->middleware('permission:reports.export|reports.attendance.export');
            Route::get('/classrooms/{classroom}', [AnalyticsApiController::class, 'classroomReport'])
                ->middleware('permission:reports.view|reports.attendance.view');
            Route::get('/classrooms/{classroom}/export', [AnalyticsApiController::class, 'exportClassroomCsv'])
                ->middleware('permission:reports.export|reports.attendance.export');
        });

        // Dynamic Participant Engine
        Route::prefix('participants')->group(function () {
            Route::get('/activity/{activity}/preview', [DomainManagementApiController::class, 'previewActivityParticipants'])
                ->middleware('permission:activities.view|attendance.sessions.view');
            Route::get('/sessions/{session}/preview', [DomainManagementApiController::class, 'previewSessionSnapshot'])
                ->middleware('permission:attendance.sessions.view');
            Route::post('/sessions/{session}/refresh', [DomainManagementApiController::class, 'refreshSessionSnapshot'])
                ->middleware('permission:attendance.sessions.create|attendance.sessions.open');
        });

        // Academic / KBM (Sprint 6)
        Route::prefix('academic')->group(function () {
            Route::get('/overview', [DomainManagementApiController::class, 'academicIndex'])
                ->middleware('permission:kbm.teacher_dashboard|kbm.monitoring|kbm.master');
            Route::post('/generate-sessions', [DomainManagementApiController::class, 'generateAcademicSessions'])
                ->middleware('permission:kbm.master|attendance.sessions.create');
        });

        // Routine & Boarding (Sprint 7)
        Route::prefix('routine')->group(function () {
            Route::get('/overview', [DomainManagementApiController::class, 'routineIndex'])
                ->middleware('permission:routine.view|dormitory.view|prayer.view');
            Route::post('/generate-sessions', [DomainManagementApiController::class, 'generateRoutineSessions'])
                ->middleware('permission:attendance.sessions.create|routine_schedule.manage');
        });

        // Extracurriculars & Events (Sprint 8)
        Route::prefix('extracurriculars')->group(function () {
            Route::get('/', [DomainManagementApiController::class, 'extracurricularIndex'])
                ->middleware('permission:extracurriculars.view|trainer.attendance');
        });

        Route::prefix('events')->group(function () {
            Route::get('/', [DomainManagementApiController::class, 'eventsIndex'])
                ->middleware('permission:events.view');
            Route::post('/{event}/generate-sessions', [DomainManagementApiController::class, 'generateEventSessions'])
                ->middleware('permission:events.manage|attendance.sessions.create');
        });
    });

    // Migrasi data lama dari localStorage browser ke MySQL (halaman /migrasi-data)
    Route::post('/migration/local-data', LocalDataMigrationApiController::class)
        ->middleware(['auth:sanctum', 'permission:system.maintenance']);

    // Backup database (admin & super-admin); pemulihan hanya super-admin + kalimat konfirmasi
    Route::prefix('maintenance/backups')->middleware(['auth:sanctum', 'permission:system.backup|system.maintenance'])->group(function () {
        Route::get('/', [SystemBackupApiController::class, 'index']);
        Route::post('/', [SystemBackupApiController::class, 'store']);
        Route::get('/{backupId}/download', [SystemBackupApiController::class, 'download']);
        Route::delete('/{backupId}', [SystemBackupApiController::class, 'destroy']);
        Route::post('/{backupId}/restore', [SystemBackupApiController::class, 'restore'])->middleware('role:super-admin');
    });

    // System Maintenance & Database Reset (Super Admin only + exact phrase verification)
    Route::prefix('maintenance')->middleware(['auth:sanctum', 'permission:system.backup|system.maintenance'])->group(function () {
        Route::get('/overview', [MaintenanceApiController::class, 'overview']);
        Route::get('/logs', [MaintenanceApiController::class, 'logs']);
        Route::post('/integrity', [MaintenanceApiController::class, 'integrity']);
    });
    Route::prefix('maintenance')->middleware(['auth:sanctum', 'role:super-admin'])->group(function () {
        Route::get('/reset-modes', [MaintenanceApiController::class, 'resetModes']);
        Route::post('/reset', [MaintenanceApiController::class, 'reset'])->middleware('throttle:5,1');
    });

    // =========================================================================
    // LANDING PAGE CMS & PSB / PPDB
    // =========================================================================
    Route::prefix('cms')->group(function () {
        // --- Publik (tanpa login) ---
        Route::get('/landing', [LandingCmsApiController::class, 'getPublicData']);
        Route::get('/institution', [AppSettingsApiController::class, 'publicInstitution']);
        Route::post('/psb/register', [LandingCmsApiController::class, 'submitPpdbRegistration'])->middleware('throttle:5,1');
        Route::post('/ppdb/register', [LandingCmsApiController::class, 'submitPpdbRegistration'])->middleware('throttle:5,1');
        Route::get('/psb/check', [LandingCmsApiController::class, 'checkPpdbStatus'])->middleware('throttle:10,1');
        Route::get('/ppdb/check', [LandingCmsApiController::class, 'checkPpdbStatus'])->middleware('throttle:10,1');

        // --- Admin CMS (wajib login + izin kelola CMS) ---
        Route::middleware(['auth:sanctum', 'permission:cms.manage|settings.manage'])->group(function () {
            Route::post('/profile', [LandingCmsApiController::class, 'updateProfile']);
            Route::post('/news', [LandingCmsApiController::class, 'storeNews']);
            Route::put('/news/{id}', [LandingCmsApiController::class, 'updateNews']);
            Route::delete('/news/{id}', [LandingCmsApiController::class, 'deleteNews']);
        });

        // --- Admin PSB (wajib login + izin PSB) ---
        Route::middleware(['auth:sanctum', 'permission:psb.manage|ppdb.manage|cms.manage'])->group(function () {
            Route::post('/psb', [LandingCmsApiController::class, 'updatePpdb']);
            Route::post('/ppdb', [LandingCmsApiController::class, 'updatePpdb']);
        });
        Route::middleware(['auth:sanctum', 'permission:psb.view|ppdb.view|psb.manage|ppdb.manage'])->group(function () {
            Route::get('/psb/registrations', [LandingCmsApiController::class, 'listPpdbRegistrations']);
            Route::get('/ppdb/registrations', [LandingCmsApiController::class, 'listPpdbRegistrations']);
        });
        Route::middleware(['auth:sanctum', 'permission:psb.manage|ppdb.manage|psb.verify|ppdb.verify'])->group(function () {
            foreach (['psb', 'ppdb'] as $p) {
                Route::match(['put', 'patch'], "/{$p}/registrations/{id}", [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
                Route::match(['put', 'patch'], "/{$p}/registrations/{id}/status", [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
            }
        });
        Route::middleware(['auth:sanctum', 'permission:psb.manage|ppdb.manage'])->group(function () {
            Route::delete('/psb/registrations/{id}', [LandingCmsApiController::class, 'deletePpdbRegistration']);
            Route::delete('/ppdb/registrations/{id}', [LandingCmsApiController::class, 'deletePpdbRegistration']);
        });
    });

    // =========================================================================
    // IoT HARDWARE BRIDGE (ESP32 / Nexabsen V.4) - wajib header X-GLOBAL-KEY
    // =========================================================================
    Route::middleware(['iot.key', 'throttle:iot'])->group(function () {
        Route::match(['get', 'post'], '/tap.php', [IotDeviceApiController::class, 'handleRfidTap']);
        Route::prefix('iot')->group(function () {
            Route::match(['get', 'post'], '/rfid-tap', [IotDeviceApiController::class, 'handleRfidTap']);
            Route::match(['get', 'post'], '/tap.php', [IotDeviceApiController::class, 'handleRfidTap']);
            Route::match(['get', 'post'], '/nexabsen', [IotDeviceApiController::class, 'handleRfidTap']);
            Route::match(['get', 'post'], '/ping', [IotDeviceApiController::class, 'ping']);
            Route::get('/active-sessions', [IotDeviceApiController::class, 'getActiveSessions']);
        });
    });

    // Whitelist perangkat RFID (aktivasi / nonaktifkan alat) - wajib login admin perangkat
    Route::prefix('devices')->middleware(['auth:sanctum'])->group(function () {
        Route::get('/', [DeviceManagementApiController::class, 'index'])->middleware('permission:devices.view|devices.manage');
        Route::post('/', [DeviceManagementApiController::class, 'store'])->middleware('permission:devices.create|devices.manage');
        Route::patch('/{device}', [DeviceManagementApiController::class, 'update'])->middleware('permission:devices.manage|devices.update');
        Route::post('/{device}/token', [DeviceManagementApiController::class, 'rotateToken'])->middleware('permission:devices.manage|devices.update');
    });

    // Registrasi kartu RFID (dipakai halaman /registrasi-rfid) - wajib login admin
    Route::prefix('iot')->middleware(['auth:sanctum', 'permission:devices.manage|students.cards'])->group(function () {
        Route::get('/last-scan', [IotDeviceApiController::class, 'getLastScan']);
        Route::get('/students', [IotDeviceApiController::class, 'getStudentsWithRfid']);
        Route::post('/register-rfid', [IotDeviceApiController::class, 'registerRfid']);
        Route::post('/unregister-rfid', [IotDeviceApiController::class, 'unregisterRfid']);
    });
});
