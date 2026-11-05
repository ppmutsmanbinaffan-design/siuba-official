<?php

namespace App\Services\Analytics;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceReportService
{
    public function __construct(
        protected AttendanceMetricService $metricService
    ) {}

    /**
     * Generate Daily Attendance Report
     */
    public function generateDailyReport(string $date, array $filters = []): array
    {
        $sessions = AttendanceSession::where('session_date', $date)
            ->where('status', '!=', 'cancelled')
            ->with(['activity.category'])
            ->get();

        $rows = [];
        foreach ($sessions as $session) {
            $metrics = $this->metricService->calculateMetrics([
                'session_ids' => [$session->id],
            ]);

            $rows[] = [
                'session_id' => $session->id,
                'session_code' => $session->session_code,
                'activity_name' => $session->activity->name ?? 'Kegiatan',
                'category_name' => $session->activity->category->name ?? 'Umum',
                'status' => $session->status->value,
                'start_at' => $session->start_at?->format('H:i'),
                'end_at' => $session->end_at?->format('H:i'),
                'metrics' => $metrics,
            ];
        }

        $summaryMetrics = $this->metricService->calculateMetrics([
            'date_from' => $date,
            'date_to' => $date,
        ]);

        return [
            'report_type' => 'daily_attendance',
            'report_date' => $date,
            'session_count' => count($sessions),
            'summary_metrics' => $summaryMetrics,
            'rows' => $rows,
        ];
    }

    /**
     * Generate Classroom Attendance Recap Report
     */
    public function generateClassroomReport(int $classroomId, string $startDate, string $endDate): array
    {
        $classroom = Classroom::findOrFail($classroomId);
        $students = Student::where('classroom_id', $classroomId)
            ->where('status', 'active')
            ->orderBy('name', 'asc')
            ->get();

        $studentRows = [];
        foreach ($students as $student) {
            $metrics = $this->metricService->calculateMetrics([
                'student_id' => $student->id,
                'date_from' => $startDate,
                'date_to' => $endDate,
            ]);

            $studentRows[] = [
                'student_id' => $student->id,
                'student_number' => $student->student_number,
                'name' => $student->name,
                'gender' => $student->gender,
                'metrics' => $metrics,
            ];
        }

        $overallMetrics = $this->metricService->calculateMetrics([
            'classroom_id' => $classroomId,
            'date_from' => $startDate,
            'date_to' => $endDate,
        ]);

        return [
            'report_type' => 'classroom_recap',
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'grade_level' => $classroom->grade_level,
            ],
            'period' => ['start' => $startDate, 'end' => $endDate],
            'overall_metrics' => $overallMetrics,
            'students' => $studentRows,
        ];
    }

    /**
     * Stream CSV Export for Daily Report
     */
    public function exportDailyReportCsv(string $date, array $filters = []): StreamedResponse
    {
        $reportData = $this->generateDailyReport($date, $filters);
        $filename = "SIUBA_Laporan_Harian_{$date}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return new StreamedResponse(function () use ($reportData) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fputs($handle, "\xEF\xBB\xBF");

            // Title block
            fputcsv($handle, ['SIUBA - SISTEM INFORMASI UTSMAN BIN AFFAN']);
            fputcsv($handle, ['LAPORAN PRESENSI HARIAN KEGIATAN SANTRI']);
            fputcsv($handle, ['Tanggal:', $reportData['report_date']]);
            fputcsv($handle, ['Total Sesi:', $reportData['session_count']]);
            fputcsv($handle, ['Tingkat Kehadiran:', $reportData['summary_metrics']['attendance_rate'] . '%']);
            fputcsv($handle, []); // empty line

            // Header row
            fputcsv($handle, [
                'Kode Sesi',
                'Nama Kegiatan',
                'Kategori',
                'Waktu Mulai',
                'Waktu Selesai',
                'Status Sesi',
                'Santri Eligible',
                'Tercatat',
                'Hadir',
                'Terlambat',
                'Izin',
                'Sakit',
                'Dispensasi',
                'Alpha',
                'Attendance Rate (%)',
                'On-Time Rate (%)',
            ]);

            // Data rows
            foreach ($reportData['rows'] as $row) {
                $m = $row['metrics'];
                fputcsv($handle, [
                    $row['session_code'],
                    $row['activity_name'],
                    $row['category_name'],
                    $row['start_at'],
                    $row['end_at'],
                    strtoupper($row['status']),
                    $m['total_eligible'],
                    $m['total_recorded'],
                    $m['present'],
                    $m['late'],
                    $m['permission'],
                    $m['sick'],
                    $m['dispensation'],
                    $m['absent'],
                    $m['attendance_rate'],
                    $m['on_time_rate'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Stream CSV Export for Classroom Recap Report
     */
    public function exportClassroomReportCsv(int $classroomId, string $startDate, string $endDate): StreamedResponse
    {
        $reportData = $this->generateClassroomReport($classroomId, $startDate, $endDate);
        $className = str_replace(' ', '_', $reportData['classroom']['name']);
        $filename = "SIUBA_Rekap_Kelas_{$className}_{$startDate}_sd_{$endDate}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return new StreamedResponse(function () use ($reportData) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['SIUBA - REKAPITULASI PRESENSI SANTRI PER KELAS']);
            fputcsv($handle, ['Kelas:', $reportData['classroom']['name']]);
            fputcsv($handle, ['Periode:', "{$reportData['period']['start']} s/d {$reportData['period']['end']}"]);
            fputcsv($handle, ['Rata-rata Kehadiran Kelas:', $reportData['overall_metrics']['attendance_rate'] . '%']);
            fputcsv($handle, []);

            fputcsv($handle, [
                'NIS',
                'Nama Santri',
                'Jenis Kelamin',
                'Total Eligible Sesi',
                'Total Tercatat',
                'Hadir',
                'Terlambat',
                'Izin',
                'Sakit',
                'Dispensasi',
                'Alpha',
                'Attendance Rate (%)',
                'On-Time Rate (%)',
                'Alpha Rate (%)',
            ]);

            foreach ($reportData['students'] as $s) {
                $m = $s['metrics'];
                fputcsv($handle, [
                    $s['student_number'],
                    $s['name'],
                    $s['gender'] === 'L' ? 'Laki-laki' : 'Perempuan',
                    $m['total_eligible'],
                    $m['total_recorded'],
                    $m['present'],
                    $m['late'],
                    $m['permission'],
                    $m['sick'],
                    $m['dispensation'],
                    $m['absent'],
                    $m['attendance_rate'],
                    $m['on_time_rate'],
                    $m['absent_rate'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
