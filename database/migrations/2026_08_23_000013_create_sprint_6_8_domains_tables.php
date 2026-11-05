<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Dynamic Participant Rules
        Schema::create('activity_participant_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->string('rule_type', 32); // all_students, classroom, grade_level, dormitory, room, halaqah, extracurricular, custom_group, duty_roster, event_registration, individual
            $table->string('rule_operator', 16)->default('include'); // include, exclude
            $table->unsignedBigInteger('source_id')->nullable();
            $table->json('rule_value')->nullable();
            $table->integer('priority')->default(10);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['activity_id', 'is_active']);
            $table->index(['rule_type', 'source_id']);
        });

        // 2. Academic Master: Academic Years
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 32); // e.g. 2026/2027
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        // 3. Academic Master: Semesters
        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->string('code', 16); // GANJIL, GENAP
            $table->string('name', 32); // Semester Ganjil, Semester Genap
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        // 4. Academic Master: Subjects
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->string('short_name', 32)->nullable();
            $table->string('category', 32)->default('UMUM'); // DINIYAH, TAHFIDZ, UMUM, BAHASA
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 5. Lesson Periods (Jam Pelajaran / JP)
        Schema::create('lesson_periods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16); // JP-1, JP-2, ISTIRAHAT-1
            $table->string('name', 32); // Jam Ke-1, Istirahat Dhuha
            $table->unsignedSmallInteger('period_number');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('day_type', 16)->default('REGULAR'); // REGULAR, FRIDAY
            $table->boolean('is_break')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->timestamps();
        });

        // 6. Teaching Assignments (SK Mengajar Guru)
        Schema::create('teaching_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained('semesters')->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('weekly_periods')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['academic_year_id', 'semester_id', 'classroom_id', 'subject_id', 'teacher_id'], 'uq_teach_assign');
        });

        // 7. Academic Schedules (Jadwal Pelajaran Rutin)
        Schema::create('academic_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained('semesters')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Sunday, 1=Monday, ..., 6=Saturday
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lesson_period_id')->constrained('lesson_periods')->cascadeOnDelete();
            $table->foreignId('activity_id')->nullable()->constrained('activities')->nullOnDelete();
            $table->string('room_location', 64)->nullable();
            $table->date('effective_start_date')->nullable();
            $table->date('effective_end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Constraint: 1 Jadwal per kelas & jam pelajaran di hari tsb
            $table->unique(['academic_year_id', 'semester_id', 'day_of_week', 'classroom_id', 'lesson_period_id'], 'uq_acad_schedule_class_period');
        });

        // 8. Academic Session Contexts (Historical Snapshot Link)
        Schema::create('academic_session_contexts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->unique()->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('academic_schedule_id')->nullable()->constrained('academic_schedules')->nullOnDelete();
            $table->foreignId('lesson_period_id')->nullable()->constrained('lesson_periods')->nullOnDelete();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('scheduled_teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('teaching_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('topic', 255)->nullable();
            $table->timestamps();
        });

        // 9. Academic Calendar Events (Libur, Ujian, dll)
        Schema::create('academic_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->string('name', 100);
            $table->string('type', 32); // holiday, exam, school_event, pesantren_event, special_schedule
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('affects_academic_schedule')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 10. Academic Substitutions (Guru Pengganti)
        Schema::create('academic_substitutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_schedule_id')->constrained('academic_schedules')->cascadeOnDelete();
            $table->foreignId('attendance_session_id')->nullable()->constrained('attendance_sessions')->nullOnDelete();
            $table->foreignId('original_teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('substitute_teacher_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('reason', 255)->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 11. Boarding: Halaqah
        Schema::create('halaqahs', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete(); // Ustadz Pembina Halaqah
            $table->string('location', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('halaqah_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('halaqah_id')->constrained('halaqahs')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->date('joined_at')->nullable();
            $table->date('left_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['halaqah_id', 'student_id'], 'uq_halaqah_member');
        });

        // 12. Boarding: Duty Rosters (Piket Santri)
        Schema::create('duty_rosters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('role', 64)->nullable(); // Imam, Muadzin, Kebersihan, Keamanan
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['activity_id', 'date', 'student_id'], 'uq_duty_roster_act_date_student');
        });

        // 13. Routine Schedule Overrides
        Schema::create('routine_schedule_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_schedule_id')->constrained('activity_schedules')->cascadeOnDelete();
            $table->date('date');
            $table->string('type', 32); // cancelled, time_changed, location_changed, special_activity
            $table->time('new_start_time')->nullable();
            $table->time('new_present_until')->nullable();
            $table->time('new_late_until')->nullable();
            $table->time('new_end_time')->nullable();
            $table->string('new_location', 100)->nullable();
            $table->string('reason', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 14. Activity Supervisors (Musyrif / Pembina Kegiatan)
        Schema::create('activity_supervisors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_type', 32)->default('SUPERVISOR'); // SUPERVISOR, PETUGAS_MASJID, MUSYRIF, COACH
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['activity_id', 'user_id', 'role_type'], 'uq_activity_supervisor');
        });

        // 15. Extracurriculars
        Schema::create('extracurriculars', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->foreignId('coach_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assistant_coach_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location', 64)->nullable();
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->dateTime('registration_open_at')->nullable();
            $table->dateTime('registration_close_at')->nullable();
            $table->boolean('waitlist_enabled')->default(true);
            $table->boolean('approval_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('extracurricular_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extracurricular_id')->constrained('extracurriculars')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('membership_status', 32)->default('active'); // pending, active, waitlisted, rejected, resigned, removed, completed
            $table->dateTime('joined_at')->nullable();
            $table->dateTime('left_at')->nullable();
            $table->string('registration_source', 32)->default('portal');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['extracurricular_id', 'student_id'], 'uq_extracurricular_member');
        });

        // 16. Events & Special Activities
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('event_type', 32)->default('pesantren_event'); // school_event, pesantren_event, seminar, competition, training, outing, study_tour, service, ceremony, special_activity
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->dateTime('registration_open_at')->nullable();
            $table->dateTime('registration_close_at')->nullable();
            $table->string('location', 100)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('participant_mode', 32)->default('all'); // all, registered, dynamic_rules, invitation
            $table->boolean('attendance_enabled')->default(true);
            $table->string('status', 32)->default('draft'); // draft, published, registration_open, registration_closed, ongoing, completed, cancelled
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('event_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name', 100);
            $table->dateTime('start_at');
            $table->dateTime('present_until');
            $table->dateTime('late_until');
            $table->dateTime('end_at');
            $table->string('location', 100)->nullable();
            $table->boolean('attendance_required')->default(true);
            $table->string('finalization_policy', 32)->default('required'); // required, optional, checkin_only
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->timestamps();
        });

        Schema::create('event_attendance_session_contexts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->unique()->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('event_session_id')->constrained('event_sessions')->cascadeOnDelete();
            $table->string('finalization_policy', 32)->default('required');
            $table->timestamps();
        });

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('status', 32)->default('approved'); // pending, approved, waitlisted, rejected, cancelled
            $table->dateTime('registered_at')->nullable();
            $table->string('registration_source', 32)->default('internal');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'student_id'], 'uq_event_registration');
        });

        Schema::create('event_organizers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 32)->default('ORGANIZER'); // CHAIR, SECRETARY, COMMITTEE, SCANNER
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['event_id', 'user_id'], 'uq_event_organizer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_organizers');
        Schema::dropIfExists('event_registrations');
        Schema::dropIfExists('event_attendance_session_contexts');
        Schema::dropIfExists('event_sessions');
        Schema::dropIfExists('events');
        Schema::dropIfExists('extracurricular_members');
        Schema::dropIfExists('extracurriculars');
        Schema::dropIfExists('activity_supervisors');
        Schema::dropIfExists('routine_schedule_overrides');
        Schema::dropIfExists('duty_rosters');
        Schema::dropIfExists('halaqah_members');
        Schema::dropIfExists('halaqahs');
        Schema::dropIfExists('academic_substitutions');
        Schema::dropIfExists('academic_calendar_events');
        Schema::dropIfExists('academic_session_contexts');
        Schema::dropIfExists('academic_schedules');
        Schema::dropIfExists('teaching_assignments');
        Schema::dropIfExists('lesson_periods');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('semesters');
        Schema::dropIfExists('academic_years');
        Schema::dropIfExists('activity_participant_rules');
    }
};
