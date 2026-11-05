<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\Analytics\AttendanceReportService;
use App\Services\Analytics\DomainAnalyticsService;
use App\Services\Analytics\ExecutiveDashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsApiController extends Controller
{
    public function __construct(
        protected ExecutiveDashboardService $dashboardService,
        protected DomainAnalyticsService $domainAnalyticsService,
        protected AttendanceReportService $reportService
    ) {}

    /**
     * Get Executive Dashboard Summary & Realtime KPIs
     */
    public function dashboard(Request $request): JsonResponse
    {
        $date = $request->query('date', Carbon::now('Asia/Jakarta')->toDateString());
        $summary = $this->dashboardService->getExecutiveSummary($date);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get Student Attendance Analytics Profile
     */
    public function studentAnalytics(Student $student, Request $request): JsonResponse
    {
        $filters = [
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
        ];

        $analytics = $this->domainAnalyticsService->getStudentAnalytics($student, $filters);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Get Classroom Attendance Analytics
     */
    public function classroomAnalytics(Classroom $classroom, Request $request): JsonResponse
    {
        $filters = [
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
        ];

        $analytics = $this->domainAnalyticsService->getClassroomAnalytics($classroom, $filters);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Get 5 Daily Prayers Analytics
     */
    public function prayerAnalytics(Request $request): JsonResponse
    {
        $filters = [
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
        ];

        $analytics = $this->domainAnalyticsService->getPrayerAnalytics($filters);

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Get Device Terminal Analytics & Online Status
     */
    public function deviceAnalytics(): JsonResponse
    {
        $analytics = $this->domainAnalyticsService->getDeviceAnalytics();

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Generate Daily Attendance Report JSON
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $date = $request->query('date', Carbon::now('Asia/Jakarta')->toDateString());
        $report = $this->reportService->generateDailyReport($date);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Generate Classroom Recap Report JSON
     */
    public function classroomReport(Classroom $classroom, Request $request): JsonResponse
    {
        $startDate = $request->query('start_date', Carbon::now('Asia/Jakarta')->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now('Asia/Jakarta')->toDateString());

        $report = $this->reportService->generateClassroomReport($classroom->id, $startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Export Daily Report to CSV
     */
    public function exportDailyCsv(Request $request): StreamedResponse
    {
        $date = $request->query('date', Carbon::now('Asia/Jakarta')->toDateString());
        return $this->reportService->exportDailyReportCsv($date);
    }

    /**
     * Export Classroom Recap to CSV
     */
    public function exportClassroomCsv(Classroom $classroom, Request $request): StreamedResponse
    {
        $startDate = $request->query('start_date', Carbon::now('Asia/Jakarta')->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now('Asia/Jakarta')->toDateString());

        return $this->reportService->exportClassroomReportCsv($classroom->id, $startDate, $endDate);
    }
}
