<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define all canonical system permissions
        $permissions = [
            // Dashboard
            'dashboard.view',
            'dashboard.executive',

            // Students
            'students.view',
            'students.create',
            'students.update',
            'students.delete',
            'students.edit',
            'students.deactivate',
            'students.cards',

            // Master Data & Academic
            'activities.view',
            'activities.create',
            'activities.update',
            'activities.delete',
            'classrooms.view',
            'classrooms.manage',
            'dormitories.view',
            'extracurriculars.view',

            // Attendance Engine & Sessions
            'attendance.view',
            'attendance.create',
            'attendance.update',
            'attendance.delete',
            'attendance.scan',
            'attendance.manual',
            'attendance.qr',
            'attendance.rfid',
            'attendance.monitoring',
            'attendance.excuses',
            'attendance.history',
            'attendance.sessions.view',
            'attendance.sessions.create',
            'attendance.sessions.open',
            'attendance.sessions.close',

            // Reports
            'reports.view',
            'reports.export',
            'reports.attendance.view',
            'reports.attendance.export',

            // SDM / Staff
            'staff.view',
            'staff.create',
            'staff.edit',
            'staff.deactivate',
            'staff.attendance',
            'staff.reports',
            'trainer.attendance',

            // Routine, Prayer, Boarding, Halaqah
            'routine.view',
            'prayer.view',
            'prayer.monitoring',
            'dormitory.view',
            'dormitory.monitoring',
            'dormitory.manage',
            'halaqah.view',
            'duty_roster.view',
            'routine_schedule.view',
            'halaqah.manage',
            'duty_roster.manage',
            'extracurriculars.manage',
            'routine_schedule.manage',

            // Events
            'events.view',
            'events.manage',

            // KBM / Academic
            'kbm.teacher_dashboard',
            'kbm.monitoring',
            'kbm.timetable',
            'kbm.master',
            'kbm.reports',

            // Hardware & Terminal
            'devices.view',
            'devices.create',
            'devices.update',
            'devices.manage',

            // Website / Landing Page CMS
            'cms.manage',

            // Penerimaan Santri Baru (PSB / PPDB)
            'psb.view',
            'psb.manage',
            'psb.verify',
            'psb.export',
            'ppdb.view',
            'ppdb.manage',
            'ppdb.verify',
            'ppdb.export',

            // Users & Security
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // System
            'system.sync_center',
            'system.maintenance',
            'system.security_audit',
            'system.settings',
            'settings.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // 2. Define Roles and assignments
        $roles = [
            'super-admin' => $permissions,

            'admin' => [
                'classrooms.manage', 'routine_schedule.manage', 'halaqah.manage', 'duty_roster.manage', 'extracurriculars.manage',
                'dashboard.view',
                'dashboard.executive',
                'students.view', 'students.create', 'students.update', 'students.edit', 'students.deactivate', 'students.cards',
                'activities.view', 'activities.create', 'activities.update', 'activities.delete',
                'classrooms.view', 'dormitories.view', 'extracurriculars.view',
                'attendance.view', 'attendance.create', 'attendance.update', 'attendance.scan', 'attendance.manual', 'attendance.qr', 'attendance.rfid', 'attendance.monitoring', 'attendance.excuses', 'attendance.history',
                'attendance.sessions.view', 'attendance.sessions.create', 'attendance.sessions.open', 'attendance.sessions.close',
                'reports.view', 'reports.export', 'reports.attendance.view', 'reports.attendance.export',
                'staff.view', 'staff.create', 'staff.edit', 'staff.deactivate', 'staff.attendance', 'staff.reports',
                'trainer.attendance',
                'routine.view', 'prayer.view', 'prayer.monitoring',
                'dormitory.view', 'dormitory.monitoring', 'dormitory.manage',
                'halaqah.view', 'duty_roster.view', 'routine_schedule.view',
                'events.view', 'events.manage',
                'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.master', 'kbm.reports',
                'devices.view', 'devices.create', 'devices.update', 'devices.manage',
                'cms.manage',
                'psb.view', 'psb.manage', 'psb.verify', 'psb.export',
                'ppdb.view', 'ppdb.manage', 'ppdb.verify', 'ppdb.export',
                'system.sync_center', 'system.settings', 'settings.manage',
            ],

            'pimpinan' => [
                'dashboard.view',
                'dashboard.executive',
                'students.view',
                'attendance.view',
                'attendance.sessions.view',
                'reports.view', 'reports.export', 'reports.attendance.view', 'reports.attendance.export',
                'staff.reports',
                'kbm.reports', 'kbm.monitoring',
                'dormitory.view',
            ],

            'kepala-sekolah' => [
                'dashboard.view',
                'dashboard.executive',
                'students.view', 'students.create', 'students.edit',
                'staff.view', 'staff.attendance', 'staff.reports',
                'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.master', 'kbm.reports',
                'attendance.view', 'attendance.sessions.view',
                'reports.view', 'reports.export', 'reports.attendance.view', 'reports.attendance.export',
            ],

            'kepala-asrama' => [
                'routine_schedule.manage', 'halaqah.manage', 'duty_roster.manage',
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.excuses',
                'attendance.sessions.view',
                'dormitory.view', 'dormitory.monitoring', 'dormitory.manage',
                'prayer.monitoring',
                'halaqah.view',
                'duty_roster.view',
                'reports.view', 'reports.attendance.view',
            ],

            'guru' => [
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual',
                'attendance.sessions.view',
                'staff.attendance',
                'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.reports',
                'reports.attendance.view',
            ],

            'teacher' => [
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual',
                'attendance.sessions.view',
                'staff.attendance',
                'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.reports',
                'reports.attendance.view',
            ],

            'wali-kelas' => [
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual',
                'attendance.sessions.view',
                'reports.attendance.view', 'reports.attendance.export',
                'kbm.monitoring',
            ],

            'musyrif' => [
                'duty_roster.manage',
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual', 'attendance.qr', 'attendance.rfid', 'attendance.monitoring', 'attendance.excuses',
                'attendance.sessions.view', 'attendance.sessions.open', 'attendance.sessions.close',
                'dormitory.view', 'dormitory.monitoring',
                'prayer.monitoring',
                'halaqah.view',
                'duty_roster.view',
            ],

            'pelatih' => [
                'dashboard.view',
                'students.view',
                'trainer.attendance',
                'extracurriculars.view',
                'attendance.view',
                'attendance.sessions.view',
            ],

            'petugas-masjid' => [
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual', 'attendance.qr', 'attendance.rfid', 'attendance.monitoring',
                'attendance.sessions.view', 'attendance.sessions.open', 'attendance.sessions.close',
                'prayer.monitoring',
            ],

            'petugas-absensi' => [
                'dashboard.view',
                'students.view',
                'attendance.view', 'attendance.create', 'attendance.manual', 'attendance.qr', 'attendance.rfid', 'attendance.monitoring',
                'attendance.sessions.view', 'attendance.sessions.open', 'attendance.sessions.close',
                'prayer.monitoring',
            ],

            'operator' => [
                'dashboard.view',
                'students.view', 'students.create', 'students.edit', 'students.cards',
                'attendance.view', 'attendance.create', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.rfid',
                'attendance.sessions.view',
                'devices.view',
            ],

            'kesantrian' => [
                'classrooms.manage', 'routine_schedule.manage', 'halaqah.manage', 'duty_roster.manage', 'extracurriculars.manage',
                'dashboard.view',
                'students.view', 'students.create', 'students.edit', 'students.deactivate', 'students.cards',
                'staff.view',
                'attendance.view', 'attendance.create', 'attendance.scan', 'attendance.manual', 'attendance.monitoring', 'attendance.excuses',
                'dormitory.view', 'dormitory.manage',
                'reports.view', 'reports.export', 'reports.attendance.view',
            ],

            'academic' => [
                'classrooms.manage', 'dashboard.view',
                'students.view', 'students.create', 'students.edit',
                'staff.view',
                'kbm.teacher_dashboard', 'kbm.monitoring', 'kbm.timetable', 'kbm.master', 'kbm.reports',
                'reports.view',
            ],

            'panitia-psb' => [
                'dashboard.view',
                'students.view',
                'psb.view',
                'psb.manage',
                'psb.verify',
                'psb.export',
                'ppdb.view',
                'ppdb.manage',
                'ppdb.verify',
                'ppdb.export',
            ],

            'panitia-ppdb' => [
                'dashboard.view',
                'students.view',
                'psb.view',
                'psb.manage',
                'psb.verify',
                'psb.export',
                'ppdb.view',
                'ppdb.manage',
                'ppdb.verify',
                'ppdb.export',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $roleWeb = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $roleWeb->syncPermissions($rolePermissions);

            $roleApi = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $roleApi->syncPermissions($rolePermissions);
        }
    }
}
