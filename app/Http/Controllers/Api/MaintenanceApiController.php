<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MaintenanceApiController extends Controller
{
    /**
     * Execute Database Reset on MySQL tables
     */
    public function reset(Request $request): JsonResponse
    {
        $mode = (string) $request->input('mode', 'MODE_A_OPERATIONAL');
        $phrase = trim((string) $request->input('confirmation_phrase', ''));

        if (strtoupper($phrase) !== 'RESET DATABASE SIUBA') {
            return response()->json([
                'success' => false,
                'message' => 'Frasa konfirmasi tidak valid. Harap masukkan "RESET DATABASE SIUBA".'
            ], 422);
        }

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            $tablesCleared = [];

            if ($mode === 'MODE_A_OPERATIONAL') {
                $operationalTables = [
                    'attendance_records',
                    'attendance_sessions',
                    'attendance_session_participants',
                    'attendance_device_logs',
                    'event_registrations',
                ];

                foreach ($operationalTables as $table) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)->truncate();
                        $tablesCleared[] = $table;
                    }
                }
            } elseif ($mode === 'MODE_B_MASTERS_EXCEPT_CORE') {
                $allTables = [
                    'attendance_records',
                    'attendance_sessions',
                    'attendance_session_participants',
                    'attendance_device_logs',
                    'event_registrations',
                    'students',
                    'classrooms',
                    'dormitory_rooms',
                    'dormitories',
                    'activities',
                    'activity_schedules',
                ];

                foreach ($allTables as $table) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)->truncate();
                        $tablesCleared[] = $table;
                    }
                }
            } elseif ($mode === 'MODE_C_FACTORY_RESET') {
                Artisan::call('migrate:fresh', [
                    '--force' => true,
                    '--seed' => true,
                ]);
                $tablesCleared[] = 'ALL_TABLES_MIGRATED_AND_RESEEDED';
            }

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            return response()->json([
                'success' => true,
                'mode' => $mode,
                'tables_cleared' => $tablesCleared,
                'message' => 'Database MySQL SIUBA berhasil dibersihkan (' . $mode . ').'
            ]);
        } catch (\Throwable $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return response()->json([
                'success' => false,
                'message' => 'Gagal mereset database MySQL: ' . $e->getMessage()
            ], 500);
        }
    }
}