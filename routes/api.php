<?php

use App\Http\Controllers\Api\AnalyticsApiController;
use App\Http\Controllers\Api\AttendanceApiController;
use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\DataImportApiController;
use App\Http\Controllers\Api\DomainManagementApiController;
use App\Http\Controllers\Api\IotDeviceApiController;
use App\Http\Controllers\Api\LandingCmsApiController;
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

    // Public / Protected User List for System Shell
    Route::get('/users', [AuthApiController::class, 'listUsers']);

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
        Route::match(['post', 'put'], '/users/{id}/roles', [AuthApiController::class, 'assignRoles']);
        Route::get('/roles', [AuthApiController::class, 'listRoles']);

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
                ->middleware('permission:routine.view|attendance.sessions.create');
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

    // System Maintenance & Database Reset (Guarded by exact phrase verification)
    Route::prefix('maintenance')->group(function () {
        Route::post('/reset', [MaintenanceApiController::class, 'reset']);
    });

    // Landing Page CMS & PSB / PPDB Management Endpoints
    Route::prefix('cms')->group(function () {
        Route::get('/landing', [LandingCmsApiController::class, 'getPublicData']);
        Route::post('/profile', [LandingCmsApiController::class, 'updateProfile']);
        Route::post('/psb', [LandingCmsApiController::class, 'updatePpdb']);
        Route::post('/ppdb', [LandingCmsApiController::class, 'updatePpdb']);
        Route::post('/news', [LandingCmsApiController::class, 'storeNews']);
        Route::put('/news/{id}', [LandingCmsApiController::class, 'updateNews']);
        Route::delete('/news/{id}', [LandingCmsApiController::class, 'deleteNews']);
        Route::post('/psb/register', [LandingCmsApiController::class, 'submitPpdbRegistration']);
        Route::post('/ppdb/register', [LandingCmsApiController::class, 'submitPpdbRegistration']);
        Route::get('/psb/check', [LandingCmsApiController::class, 'checkPpdbStatus']);
        Route::get('/ppdb/check', [LandingCmsApiController::class, 'checkPpdbStatus']);
        Route::match(['put', 'patch'], '/psb/registrations/{id}', [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
        Route::match(['put', 'patch'], '/ppdb/registrations/{id}', [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
        Route::match(['put', 'patch'], '/psb/registrations/{id}/status', [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
        Route::match(['put', 'patch'], '/ppdb/registrations/{id}/status', [LandingCmsApiController::class, 'updatePpdbRegistrationStatus']);
        Route::delete('/psb/registrations/{id}', [LandingCmsApiController::class, 'deletePpdbRegistration']);
        Route::delete('/ppdb/registrations/{id}', [LandingCmsApiController::class, 'deletePpdbRegistration']);
    });

    // IoT Hardware Bridge (ESP32 RFID Reader, Nexabsen V.4 & Smart Card Terminal)
    Route::match(['get', 'post'], '/tap.php', [IotDeviceApiController::class, 'handleRfidTap']);
    Route::prefix('iot')->group(function () {
        Route::match(['get', 'post'], '/rfid-tap', [IotDeviceApiController::class, 'handleRfidTap']);
        Route::match(['get', 'post'], '/tap.php', [IotDeviceApiController::class, 'handleRfidTap']);
        Route::match(['get', 'post'], '/nexabsen', [IotDeviceApiController::class, 'handleRfidTap']);
        Route::match(['get', 'post'], '/ping', [IotDeviceApiController::class, 'ping']);
        Route::get('/active-sessions', [IotDeviceApiController::class, 'getActiveSessions']);
        Route::get('/last-scan', [IotDeviceApiController::class, 'getLastScan']);
        Route::get('/students', [IotDeviceApiController::class, 'getStudentsWithRfid']);
        Route::post('/register-rfid', [IotDeviceApiController::class, 'registerRfid']);
        Route::post('/unregister-rfid', [IotDeviceApiController::class, 'unregisterRfid']);
    });
});
