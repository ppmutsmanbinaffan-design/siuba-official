<?php

namespace App\Livewire;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use Livewire\Component;

class ManualAttendanceSheet extends Component
{
    public AttendanceSession $session;
    public string $search = '';
    public ?int $selectedClassroomId = null;
    public ?int $selectedDormitoryRoomId = null;
    public array $attendanceStates = []; // [student_id => status_value]
    public array $notes = []; // [student_id => note_text]
    public ?string $feedbackMessage = null;
    public string $feedbackType = 'success'; // 'success' | 'error'

    public function mount(AttendanceSession $session)
    {
        $this->session = $session;
        $this->loadExistingRecords();
    }

    public function loadExistingRecords(): void
    {
        $records = AttendanceRecord::where('attendance_session_id', $this->session->id)->get();
        foreach ($records as $record) {
            $this->attendanceStates[$record->student_id] = $record->status->value;
            $this->notes[$record->student_id] = $record->notes ?? '';
        }
    }

    public function markStatus(int $studentId, string $statusValue, AttendanceService $service): void
    {
        if (!$this->session->isOpen()) {
            $this->feedbackMessage = "Sesi absensi tidak dalam status terbuka.";
            $this->feedbackType = 'error';
            return;
        }

        $student = Student::find($studentId);
        if (!$student) {
            return;
        }

        $status = AttendanceStatus::from($statusValue);
        $result = $service->record(
            session: $this->session,
            student: $student,
            method: AttendanceMethod::MANUAL,
            operator: auth()->user(),
            overrideStatus: $status,
            notes: $this->notes[$studentId] ?? null
        );

        if ($result->success) {
            $this->attendanceStates[$studentId] = $status->value;
            $this->feedbackMessage = $result->message;
            $this->feedbackType = 'success';
        } else {
            $this->feedbackMessage = $result->message;
            $this->feedbackType = 'error';
        }
    }

    public function markAllPresent(AttendanceService $service): void
    {
        if (!$this->session->isOpen()) {
            $this->feedbackMessage = "Sesi absensi tidak dalam status terbuka.";
            $this->feedbackType = 'error';
            return;
        }

        $students = $this->getFilteredStudentsQuery()->get();
        $items = [];

        foreach ($students as $student) {
            $items[] = [
                'student_id' => $student->id,
                'status' => AttendanceStatus::PRESENT,
                'notes' => $this->notes[$student->id] ?? null,
            ];
        }

        $res = $service->bulkRecord($this->session, $items, auth()->user());
        $this->loadExistingRecords();

        $this->feedbackMessage = "Berhasil menandai {$res['success_count']} santri sebagai Hadir.";
        $this->feedbackType = 'success';
    }

    public function getFilteredStudentsQuery()
    {
        return Student::active()
            ->when($this->search, fn($q) => $q->where(fn($sq) => 
                $sq->where('name', 'like', "%{$this->search}%")
                   ->orWhere('student_number', 'like', "%{$this->search}%")
                   ->orWhere('nisn', 'like', "%{$this->search}%")
            ))
            ->when($this->selectedClassroomId, fn($q) => $q->where('classroom_id', $this->selectedClassroomId))
            ->when($this->selectedDormitoryRoomId, fn($q) => $q->where('dormitory_room_id', $this->selectedDormitoryRoomId))
            ->with(['classroom', 'dormitoryRoom'])
            ->orderBy('name');
    }

    public function render()
    {
        $students = $this->getFilteredStudentsQuery()->paginate(25);
        $classrooms = Classroom::where('is_active', true)->get();
        $dormitoryRooms = DormitoryRoom::where('is_active', true)->with('dormitory')->get();

        // Calculate session metrics
        $records = AttendanceRecord::where('attendance_session_id', $this->session->id)->get();
        $counts = [
            'total' => Student::active()->count(),
            'recorded' => $records->count(),
            'present' => $records->where('status', AttendanceStatus::PRESENT)->count(),
            'late' => $records->where('status', AttendanceStatus::LATE)->count(),
            'permission' => $records->where('status', AttendanceStatus::PERMISSION)->count(),
            'sick' => $records->where('status', AttendanceStatus::SICK)->count(),
            'dispensation' => $records->where('status', AttendanceStatus::DISPENSATION)->count(),
            'absent' => $records->where('status', AttendanceStatus::ABSENT)->count(),
        ];

        return view('livewire.manual-attendance-sheet', [
            'students' => $students,
            'classrooms' => $classrooms,
            'dormitoryRooms' => $dormitoryRooms,
            'counts' => $counts,
        ]);
    }
}
