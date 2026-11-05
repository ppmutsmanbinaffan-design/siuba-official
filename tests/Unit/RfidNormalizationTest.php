<?php

namespace Tests\Unit;

use App\Models\Student;
use App\Services\Identity\StudentIdentityResolver;
use Tests\TestCase;

class RfidNormalizationTest extends TestCase
{
    protected StudentIdentityResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new StudentIdentityResolver();
    }

    /** @test */
    public function test_rfid_normalization_with_spaces()
    {
        $raw = " 04 a8 7f 12 ";
        $normalized = $this->resolver->normalizeRfidUid($raw);
        $this->assertEquals("04A87F12", $normalized);
    }

    /** @test */
    public function test_rfid_normalization_with_colons_and_hyphens()
    {
        $raw = "04:A8-7F:12";
        $normalized = $this->resolver->normalizeRfidUid($raw);
        $this->assertEquals("04A87F12", $normalized);
    }

    /** @test */
    public function test_rfid_normalization_with_null_and_empty_strings()
    {
        $this->assertNull($this->resolver->normalizeRfidUid(null));
        $this->assertNull($this->resolver->normalizeRfidUid("   "));
        $this->assertNull($this->resolver->normalizeRfidUid("---:::"));
    }

    /** @test */
    public function test_student_model_normalizes_rfid_on_create_and_update()
    {
        $student = new Student([
            'student_number' => 'TEST001',
            'name' => 'Test Santri',
            'gender' => 'L',
            'rfid_uid' => '04:ab:cd:ef',
            'is_active' => true,
        ]);

        $this->assertEquals('04ABCDEF', Student::normalizeRfidUid($student->rfid_uid));
    }
}
