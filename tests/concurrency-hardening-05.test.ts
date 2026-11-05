/**
 * SIUBA HARDENING 05 AUTOMATED TEST SUITE
 * Concurrency, Race Conditions, Idempotency, and Data Integrity Tests
 */

import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';

async function makeRequest(path: string, options: {
  method?: string;
  token?: string;
  body?: any;
  headers?: Record<string, string>;
} = {}) {
  const url = new URL(path, BASE_URL);
  const bodyData = options.body ? JSON.stringify(options.body) : null;

  return new Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
        ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode || 200, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runAllHardeningTests() {
  console.log('=================================================================');
  console.log('SIUBA HARDENING 05: CONCURRENCY & DATA INTEGRITY TEST SUITE');
  console.log('=================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedTests++;
    }
  }

  try {
    // 1. Health check
    const health = await makeRequest('/api/v1/health');
    assert(health.status === 200 && health.body.status === 'ok', 'System Health Check');

    // 2. Authentication
    const login = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'Utsman2026!Secured' },
    });
    assert(login.status === 200 && !!login.body.data.token, 'Super Admin Authentication');
    const token = login.body.data.token;

    // Reset database to initial test state
    const reset = await makeRequest('/api/v1/system/database-reset', {
      method: 'POST',
      token,
    });
    assert(reset.status === 200 && reset.body.data.operation_id, 'Database Reset to Clean State');

    // -------------------------------------------------------------
    // TEST SUITE 1: CONCURRENT ATTENDANCE RECORDING (QR + QR)
    // -------------------------------------------------------------
    console.log('\n--- Running Concurrency Test: QR + QR Simultaneous Scan ---');
    const [resQr1, resQr2] = await Promise.all([
      makeRequest('/api/v1/attendance/sessions/1/qr', {
        method: 'POST',
        token,
        body: { qr_token: 'STU-AZZAM01' },
      }),
      makeRequest('/api/v1/attendance/sessions/1/qr', {
        method: 'POST',
        token,
        body: { qr_token: 'STU-AZZAM01' },
      }),
    ]);

    const statusesQr = [resQr1.status, resQr2.status].sort();
    assert(
      statusesQr[0] === 200 && statusesQr[1] === 409,
      'Concurrent QR+QR Race Safety (Exactly 1 Success 200, 1 Duplicate 409)',
      `Got statuses: ${resQr1.status}, ${resQr2.status}`
    );

    const dupQrRes = resQr1.status === 409 ? resQr1 : resQr2;
    assert(
      dupQrRes.body.error?.code === 'ALREADY_RECORDED',
      'QR Duplicate returns standardized ALREADY_RECORDED machine code'
    );

    // -------------------------------------------------------------
    // TEST SUITE 2: MANUAL + QR RACE SAFETY
    // -------------------------------------------------------------
    console.log('\n--- Running Concurrency Test: Manual + QR Simultaneous Recording ---');
    const [resManual, resQrBilal] = await Promise.all([
      makeRequest('/api/v1/attendance/sessions/1/record', {
        method: 'POST',
        token,
        body: { student_id: 2, method: 'manual', status: 'present' },
      }),
      makeRequest('/api/v1/attendance/sessions/1/qr', {
        method: 'POST',
        token,
        body: { qr_token: 'STU-BILAL02' },
      }),
    ]);

    const statusesManQr = [resManual.status, resQrBilal.status].sort();
    assert(
      statusesManQr[0] === 200 && statusesManQr[1] === 409,
      'Concurrent Manual + QR Race Safety (Exactly 1 Success 200, 1 Duplicate 409)',
      `Got statuses: ${resManual.status}, ${resQrBilal.status}`
    );

    // -------------------------------------------------------------
    // TEST SUITE 3: QR + RFID RACE SAFETY
    // -------------------------------------------------------------
    console.log('\n--- Running Concurrency Test: QR + RFID Simultaneous Recording ---');
    const [resQrFathur, resRfidFathur] = await Promise.all([
      makeRequest('/api/v1/attendance/sessions/1/qr', {
        method: 'POST',
        token,
        body: { qr_token: 'STU-FATHUR03' },
      }),
      makeRequest('/api/v1/attendance/sessions/1/rfid', {
        method: 'POST',
        token,
        body: { rfid_uid: 'E280116060000206' },
      }),
    ]);

    const statusesQrRfid = [resQrFathur.status, resRfidFathur.status].sort();
    assert(
      statusesQrRfid[0] === 200 && statusesQrRfid[1] === 409,
      'Concurrent QR + RFID Race Safety (Exactly 1 Success 200, 1 Duplicate 409)',
      `Got statuses: ${resQrFathur.status}, ${resRfidFathur.status}`
    );

    // -------------------------------------------------------------
    // TEST SUITE 4: SESSION STATE CONFLICTS & CLOSED SESSION
    // -------------------------------------------------------------
    console.log('\n--- Running Session State & Race Test ---');
    // Try recording attendance on closed session (session #3 is closed)
    const resClosed = await makeRequest('/api/v1/attendance/sessions/3/record', {
      method: 'POST',
      token,
      body: { student_id: 1, method: 'manual' },
    });
    assert(
      resClosed.status === 409 && resClosed.body.error?.code === 'SESSION_CLOSED',
      'Attendance on Closed Session Rejected with 409 SESSION_CLOSED'
    );

    // Try recording on draft session (session #2 is draft)
    const resDraft = await makeRequest('/api/v1/attendance/sessions/2/record', {
      method: 'POST',
      token,
      body: { student_id: 1, method: 'manual' },
    });
    assert(
      resDraft.status === 409 && resDraft.body.error?.code === 'SESSION_STATE_CONFLICT',
      'Attendance on Draft Session Rejected with 409 SESSION_STATE_CONFLICT'
    );

    // Open draft session #2
    const openRes = await makeRequest('/api/v1/attendance/sessions/2/open', {
      method: 'POST',
      token,
    });
    assert(openRes.status === 200 && openRes.body.data.status === 'open', 'Draft Session Successfully Opened');

    // Close session #1
    const closeRes = await makeRequest('/api/v1/attendance/sessions/1/close', {
      method: 'POST',
      token,
    });
    assert(closeRes.status === 200 && closeRes.body.data.status === 'closed', 'Active Session Successfully Closed');

    // Double close session #1 (Idempotent Safe)
    const doubleCloseRes = await makeRequest('/api/v1/attendance/sessions/1/close', {
      method: 'POST',
      token,
    });
    assert(doubleCloseRes.status === 200 && doubleCloseRes.body.data.status === 'closed', 'Double Close Session is Safe & Idempotent');

    // -------------------------------------------------------------
    // TEST SUITE 5: STAFF DAILY ATTENDANCE & CONCURRENCY
    // -------------------------------------------------------------
    console.log('\n--- Running Staff Daily Attendance Tests ---');
    // 1. Check-in staff #1
    const checkin1 = await makeRequest('/api/v1/staff/attendance/check-in', {
      method: 'POST',
      token,
      body: { staff_id: 1, method: 'rfid' },
    });
    assert(checkin1.status === 200 && checkin1.body.data.status === 'present', 'Staff Check-In Success');

    // 2. Double check-in same staff today -> 409 ALREADY_CHECKED_IN
    const checkin2 = await makeRequest('/api/v1/staff/attendance/check-in', {
      method: 'POST',
      token,
      body: { staff_id: 1, method: 'rfid' },
    });
    assert(
      checkin2.status === 409 && checkin2.body.error?.code === 'ALREADY_CHECKED_IN',
      'Staff Double Check-In Rejected with 409 ALREADY_CHECKED_IN'
    );

    // 3. Checkout staff #2 without checkin -> 422 CHECKOUT_WITHOUT_CHECKIN
    const checkoutWithoutCheckin = await makeRequest('/api/v1/staff/attendance/check-out', {
      method: 'POST',
      token,
      body: { staff_id: 2 },
    });
    assert(
      checkoutWithoutCheckin.status === 422 && checkoutWithoutCheckin.body.error?.code === 'CHECKOUT_WITHOUT_CHECKIN',
      'Staff Checkout Without Check-In Rejected with 422 CHECKOUT_WITHOUT_CHECKIN'
    );

    // 4. Checkout staff #1 -> 200 Success
    const checkout1 = await makeRequest('/api/v1/staff/attendance/check-out', {
      method: 'POST',
      token,
      body: { staff_id: 1 },
    });
    assert(checkout1.status === 200 && !!checkout1.body.data.check_out_at, 'Staff Checkout Success');

    // 5. Double checkout staff #1 -> Idempotent 200
    const checkoutDouble = await makeRequest('/api/v1/staff/attendance/check-out', {
      method: 'POST',
      token,
      body: { staff_id: 1 },
    });
    assert(checkoutDouble.status === 200 && !!checkoutDouble.body.data.check_out_at, 'Staff Double Checkout is Safe & Idempotent');

    // -------------------------------------------------------------
    // TEST SUITE 6: OPTIMISTIC CONCURRENCY CONTROL (STALE RESOURCE)
    // -------------------------------------------------------------
    console.log('\n--- Running Optimistic Concurrency Tests ---');
    // Fetch student #1
    const stu1 = await makeRequest('/api/v1/students/1', { token });
    const currentVer = stu1.body.data.version;

    // Successful update with correct expected_version
    const updateSuccess = await makeRequest('/api/v1/students/1', {
      method: 'PUT',
      token,
      body: { expected_version: currentVer, guardian_name: 'H. Muhammad Yusuf Updated' },
    });
    assert(updateSuccess.status === 200 && updateSuccess.body.data.version === currentVer + 1, 'Optimistic Update with Valid Version Success');

    // Stale update with outdated version -> 409 STALE_RESOURCE
    const updateStale = await makeRequest('/api/v1/students/1', {
      method: 'PUT',
      token,
      body: { expected_version: currentVer, guardian_name: 'Conflicting Edit' },
    });
    assert(
      updateStale.status === 409 && updateStale.body.error?.code === 'STALE_RESOURCE',
      'Stale Resource Update Rejected with 409 STALE_RESOURCE'
    );

    // -------------------------------------------------------------
    // TEST SUITE 7: TEACHING SUBSTITUTION CONCURRENCY
    // -------------------------------------------------------------
    console.log('\n--- Running Teaching Substitution Concurrency Tests ---');
    const sub1 = await makeRequest('/api/v1/academic/substitutions', {
      method: 'POST',
      token,
      body: {
        academic_schedule_id: 101,
        date: '2026-08-29',
        original_teacher_id: 2,
        substitute_teacher_id: 3,
        reason: 'Sakit',
      },
    });
    assert(sub1.status === 201, 'Teaching Substitution Assigned Successfully');

    const sub2 = await makeRequest('/api/v1/academic/substitutions', {
      method: 'POST',
      token,
      body: {
        academic_schedule_id: 101,
        date: '2026-08-29',
        original_teacher_id: 2,
        substitute_teacher_id: 4,
        reason: 'Double assign test',
      },
    });
    assert(
      sub2.status === 409 && sub2.body.error?.code === 'SUBSTITUTE_ALREADY_ASSIGNED',
      'Duplicate Substitute Assignment Rejected with 409 SUBSTITUTE_ALREADY_ASSIGNED'
    );

    // -------------------------------------------------------------
    // TEST SUITE 8: PARTICIPANT SNAPSHOT INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- Running Participant Snapshot Integrity Test ---');
    const participantsRes = await makeRequest('/api/v1/attendance/sessions/1/participants', { token });
    assert(
      participantsRes.status === 200 && Array.isArray(participantsRes.body.data) && participantsRes.body.data.length >= 3,
      'Participant Snapshot Preserved and Read Successfully'
    );

    console.log('\n=================================================================');
    console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('=================================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal Test Suite Error:', err.message);
    process.exit(1);
  }
}

runAllHardeningTests();
