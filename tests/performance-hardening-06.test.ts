/**
 * SIUBA HARDENING 06 AUTOMATED PERFORMANCE & SCALE TEST SUITE
 * Query Optimization, High-Scale Indexing, Caching, Concurrency Burst, and Scope Safety
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
  const start = Date.now();

  return new Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders; duration: number }>((resolve, reject) => {
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
        const duration = Date.now() - start;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode || 200, body: parsed, headers: res.headers, duration });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function calculatePercentiles(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = Math.round(sorted.reduce((acc, v) => acc + v, 0) / sorted.length);
  return { p50, p95, p99, avg };
}

async function runAllPerformanceTests() {
  console.log('=================================================================');
  console.log('SIUBA HARDENING 06: PERFORMANCE & SCALE READINESS TEST SUITE');
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
    // 1. Health & Auth
    const health = await makeRequest('/api/v1/health');
    assert(health.status === 200 && health.body.status === 'ok', 'Health Check Healthy');

    const loginAdmin = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'Utsman2026!Secured' },
    });
    assert(loginAdmin.status === 200 && !!loginAdmin.body.data.token, 'Super Admin Authentication');
    const adminToken = loginAdmin.body.data.token;

    const loginMusyrif = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'musyrif.fauzi', password: 'Musyrif2026!' },
    });
    assert(loginMusyrif.status === 200 && !!loginMusyrif.body.data.token, 'Musyrif Authentication (Scoped Role)');
    const musyrifToken = loginMusyrif.body.data.token;

    // Reset database to clean state
    await makeRequest('/api/v1/system/database-reset', { method: 'POST', token: adminToken });

    // -------------------------------------------------------------
    // TEST SUITE 1: SCALE DATASET SEEDING (1,000 Students, 100 Staff, 500 Sessions)
    // -------------------------------------------------------------
    console.log('\n--- Seeding Scale Dataset (1,000+ Students, 100 Staff, 500 Sessions) ---');
    const seedRes = await makeRequest('/api/v1/system/seed-scale-dataset', {
      method: 'POST',
      token: adminToken,
      body: { students: 1000, staff: 100, sessions: 500 },
    });
    assert(
      seedRes.status === 200 && seedRes.body.data.total_students >= 1000,
      'Scale Dataset Seeded (1,000+ Students, 100 Staff, 500 Sessions in Memory)',
      `Total students: ${seedRes.body.data?.total_students}`
    );

    // -------------------------------------------------------------
    // TEST SUITE 2: INDEXED SEARCH & PAGINATION LIMIT ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- Running Search & Pagination Performance Tests ---');
    // Fast Search on 1,000 students
    const searchRes = await makeRequest('/api/v1/students?search=UBA260050', { token: adminToken });
    assert(
      searchRes.status === 200 && searchRes.body.data.length === 1 && searchRes.duration < 50,
      `Indexed Search on 1,000+ Students (Response time: ${searchRes.duration}ms)`
    );

    // Clamp max page size
    const hugePageRes = await makeRequest('/api/v1/students?per_page=100000', { token: adminToken });
    assert(
      hugePageRes.status === 200 && hugePageRes.body.meta.per_page === 100,
      'Backend Page Size Clamp Enforced (Max 100 per_page prevents memory exhaustion)',
      `Got per_page: ${hugePageRes.body.meta.per_page}`
    );

    // Staff Directory Pagination
    const staffRes = await makeRequest('/api/v1/staff?per_page=20', { token: adminToken });
    assert(
      staffRes.status === 200 && staffRes.body.data.length === 20 && staffRes.body.meta.total >= 100,
      'Staff Directory Paginated Query'
    );

    // -------------------------------------------------------------
    // TEST SUITE 3: DASHBOARD SERVER-SIDE AGGREGATION & CACHING
    // -------------------------------------------------------------
    console.log('\n--- Running Dashboard Server-Side Aggregation & Caching Tests ---');
    // Cold Dashboard Request (Uncached)
    const coldDash = await makeRequest('/api/v1/dashboard/metrics', { token: adminToken });
    assert(
      coldDash.status === 200 && coldDash.body.data.students.total_active >= 1000,
      'Dashboard Cold Aggregation Computed on Server',
      `Active students in metric: ${coldDash.body.data?.students?.total_active}`
    );

    // Hot Dashboard Request (Served from cache)
    const hotDash = await makeRequest('/api/v1/dashboard/metrics', { token: adminToken });
    assert(
      hotDash.status === 200 && hotDash.body.meta?.cached === true && hotDash.duration < 30,
      `Dashboard Cache Hit (Response time: ${hotDash.duration}ms)`
    );

    // -------------------------------------------------------------
    // TEST SUITE 4: SCOPE ISOLATION IN CACHING (Musyrif vs Super Admin)
    // -------------------------------------------------------------
    console.log('\n--- Running Scope-Safe Cache Isolation Tests ---');
    const musyrifDash = await makeRequest('/api/v1/dashboard/metrics', { token: musyrifToken });
    assert(
      musyrifDash.status === 200 && musyrifDash.body.data.scope === 'musyrif' && musyrifDash.body.data.students.total_active < 1000,
      `Scope-Safe Cache Isolation (Musyrif sees ${musyrifDash.body.data?.students?.total_active} scoped santri, no cross-user cache leak)`,
      `Musyrif active count: ${musyrifDash.body.data?.students?.total_active}`
    );

    // -------------------------------------------------------------
    // TEST SUITE 5: HIGH CONCURRENCY BURST ATTENDANCE RECORDING (50 Requests)
    // -------------------------------------------------------------
    console.log('\n--- Running High Concurrency Burst (50 Concurrent QR & RFID Scans) ---');
    const burstPromises = [];
    for (let i = 1; i <= 50; i++) {
      const pad = String(i).padStart(4, '0');
      // Alternate QR and RFID for unique students
      if (i % 2 === 0) {
        burstPromises.push(
          makeRequest('/api/v1/attendance/sessions/1/qr', {
            method: 'POST',
            token: adminToken,
            body: { qr_token: `STU-QR${pad}` },
          })
        );
      } else {
        burstPromises.push(
          makeRequest('/api/v1/attendance/sessions/1/rfid', {
            method: 'POST',
            token: adminToken,
            body: { rfid_uid: `E28011606000${pad}` },
          })
        );
      }
    }

    const burstResults = await Promise.all(burstPromises);
    const successCount = burstResults.filter((r) => r.status === 200).length;
    const latencies = burstResults.map((r) => r.duration);
    const { p50, p95, p99, avg } = calculatePercentiles(latencies);

    console.log(`Burst Results: 50 requests -> 50 unique students`);
    console.log(`Latency metrics: Avg=${avg}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`);

    assert(
      successCount === 50,
      `High Concurrency Burst: All 50/50 Scans Processed Without Failure (Success Rate: 100%)`,
      `Success: ${successCount}/50`
    );

    assert(
      p95 < 150,
      `Lean Hot Path Response Latency SLA (p95: ${p95}ms < 150ms)`
    );

    // -------------------------------------------------------------
    // TEST SUITE 6: CACHE INVALIDATION CORRECTNESS ON WRITE
    // -------------------------------------------------------------
    console.log('\n--- Running Cache Invalidation Correctness Test ---');
    const postBurstDash = await makeRequest('/api/v1/dashboard/metrics', { token: adminToken });
    assert(
      postBurstDash.status === 200 && postBurstDash.body.data.students.total_recorded === 50,
      `Dashboard Cache Invalidation on Mutation (Presence count correctly updated to ${postBurstDash.body.data.students.total_recorded})`
    );

    // -------------------------------------------------------------
    // TEST SUITE 7: REPORTING & CHUNKED EXPORT SCALE
    // -------------------------------------------------------------
    console.log('\n--- Running Reporting & Chunked Export Tests ---');
    const reportRes = await makeRequest('/api/v1/reports/attendance?page=1&per_page=25', { token: adminToken });
    assert(
      reportRes.status === 200 && reportRes.body.data.length === 25 && reportRes.body.summary.total_records === 50,
      'Attendance Report DB-Filtered with Server Aggregated Summary'
    );

    const exportRes = await makeRequest('/api/v1/reports/export?format=xlsx', { token: adminToken });
    assert(
      exportRes.status === 200 && exportRes.body.data.chunk_size === 500 && !!exportRes.body.data.download_url,
      'Chunked Export Streaming Metadata Generated Safely'
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
    console.error('Fatal Performance Test Suite Error:', err.message);
    process.exit(1);
  }
}

runAllPerformanceTests();
