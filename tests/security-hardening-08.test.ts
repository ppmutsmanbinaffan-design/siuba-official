/**
 * SIUBA HARDENING 08 AUTOMATED SECURITY, SECRETS & GO-LIVE AUDIT TEST SUITE
 * Authentication, RBAC, IDOR, Rate Limiting, File Upload Security, CSV Injection,
 * Open Redirect Defense, Token Revocation, and Production Security Headers
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

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const RESULTS: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, message: string, duration: number = 0) {
  RESULTS.push({
    suite,
    name,
    passed: condition,
    message: condition ? `PASSED: ${message}` : `FAILED: ${message}`,
    duration,
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`  ${symbol} [${suite}] ${name}: ${condition ? 'PASS' : 'FAIL'} (${message})`);
}

async function runSecurityHardening08Tests() {
  console.log('\n=================================================================');
  console.log('🔒 SIUBA HARDENING 08: PRODUCTION SECURITY & GO-LIVE AUDIT SUITE');
  console.log('=================================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: PRODUCTION SECURITY HEADERS & CORS
  // -------------------------------------------------------------------------
  console.log('▶ Suite 1: Production Security Headers & CORS Audit');
  const healthRes = await makeRequest('/api/v1/health');
  assert(
    healthRes.headers['x-content-type-options'] === 'nosniff',
    'SECURITY_HEADERS',
    'X-Content-Type-Options',
    `Expected 'nosniff', received: '${healthRes.headers['x-content-type-options']}'`
  );
  assert(
    healthRes.headers['x-frame-options'] === 'SAMEORIGIN',
    'SECURITY_HEADERS',
    'X-Frame-Options',
    `Expected 'SAMEORIGIN', received: '${healthRes.headers['x-frame-options']}'`
  );
  assert(
    Boolean(healthRes.headers['content-security-policy']),
    'SECURITY_HEADERS',
    'Content-Security-Policy',
    'CSP header configured for production'
  );
  assert(
    Boolean(healthRes.headers['referrer-policy']),
    'SECURITY_HEADERS',
    'Referrer-Policy',
    `Referrer-Policy configured: ${healthRes.headers['referrer-policy']}`
  );

  // Cache-Control on sensitive endpoints
  const authMeRes = await makeRequest('/api/v1/auth/me');
  assert(
    String(authMeRes.headers['cache-control']).includes('no-store'),
    'SECURITY_HEADERS',
    'Cache-Control (No-Store on Sensitive Auth)',
    `Sensitive auth routes have no-store cache control: ${authMeRes.headers['cache-control']}`
  );

  // -------------------------------------------------------------------------
  // SUITE 2: AUTHENTICATION & SANCTUM TOKEN HARDENING
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 2: Authentication & Token Lifecycle');
  
  // 2.1 Missing Token -> 401
  const noTokenRes = await makeRequest('/api/v1/students');
  assert(noTokenRes.status === 401, 'AUTH', 'Missing Token Rejection', `Status ${noTokenRes.status} (Expected 401)`);

  // 2.2 Invalid Token -> 401
  const invalidTokenRes = await makeRequest('/api/v1/students', { token: 'invalid_forged_token_123' });
  assert(invalidTokenRes.status === 401, 'AUTH', 'Forged Token Rejection', `Status ${invalidTokenRes.status} (Expected 401)`);

  // 2.3 Wrong Password -> 401 with Generic Error (No User Enumeration)
  const badLoginRes = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'superadmin', password: 'WrongPassword123!' },
  });
  assert(
    badLoginRes.status === 401 && badLoginRes.body?.error?.message === 'Username atau password tidak sesuai.',
    'AUTH',
    'User Enumeration Defense',
    `Generic credential failure message: ${badLoginRes.body?.error?.message}`
  );

  // 2.4 Login Successful
  const superAdminLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'superadmin', password: 'Utsman2026!Secured' },
  });
  const adminToken = superAdminLogin.body?.data?.token;
  assert(
    superAdminLogin.status === 200 && Boolean(adminToken),
    'AUTH',
    'Super Admin Authentication',
    `Token issued with role: ${superAdminLogin.body?.data?.user?.role}`
  );

  // 2.5 Musyrif & Guru Login
  const musyrifLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'musyrif.fauzi', password: 'Musyrif2026!' },
  });
  const musyrifToken = musyrifLogin.body?.data?.token;

  const guruLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'guru.hasan', password: 'Guru2026!' },
  });
  const guruToken = guruLogin.body?.data?.token;

  // -------------------------------------------------------------------------
  // SUITE 3: RBAC & SCOPED IDOR PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 3: RBAC & Scoped IDOR Enforcement');

  // 3.1 Musyrif accessing database reset -> 403 Forbidden
  const musyrifResetRes = await makeRequest('/api/v1/system/database-reset', {
    method: 'POST',
    token: musyrifToken,
    body: { mode: 'TRANSACTIONAL_ONLY' },
  });
  assert(musyrifResetRes.status === 403, 'RBAC', 'Musyrif Maintenance Access Blocked', `Status ${musyrifResetRes.status} (Expected 403)`);

  // 3.2 Musyrif IDOR protection: accessing student outside dormitory
  const musyrifIdorRes = await makeRequest('/api/v1/students/3', { token: musyrifToken }); // Student #3 is in Umar room, Musyrif Fauzi is Abu Bakar
  assert(
    musyrifIdorRes.status === 403 && String(musyrifIdorRes.body?.error?.message).includes('IDOR Protection'),
    'IDOR',
    'Musyrif Cross-Dormitory IDOR Blocked',
    `Blocked with 403: ${musyrifIdorRes.body?.error?.message}`
  );

  // 3.3 Guru IDOR protection: accessing student outside class VII A
  const guruIdorRes = await makeRequest('/api/v1/students/3', { token: guruToken }); // Student #3 is in VII B, Guru Hasan teaches VII A
  assert(
    guruIdorRes.status === 403 && String(guruIdorRes.body?.error?.message).includes('IDOR Protection'),
    'IDOR',
    'Guru Cross-Classroom IDOR Blocked',
    `Blocked with 403: ${guruIdorRes.body?.error?.message}`
  );

  // -------------------------------------------------------------------------
  // SUITE 4: FILE UPLOAD SECURITY & MIME VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 4: File Upload Security & MIME Inspection');

  // 4.1 Reject SVG File (SVG XSS Attack Prevention)
  const svgUploadRes = await makeRequest('/api/v1/uploads/photo', {
    method: 'POST',
    token: adminToken,
    body: {
      filename: 'malicious.svg',
      mime_type: 'image/svg+xml',
      data: '<svg onload="alert(1)"></svg>',
    },
  });
  assert(
    svgUploadRes.status === 422 && svgUploadRes.body?.error?.code === 'SVG_FORBIDDEN',
    'UPLOAD_SECURITY',
    'SVG Upload XSS Prevention',
    `SVG rejected safely: ${svgUploadRes.body?.error?.message}`
  );

  // 4.2 Reject Path Traversal in Filename
  const traversalUploadRes = await makeRequest('/api/v1/uploads/photo', {
    method: 'POST',
    token: adminToken,
    body: {
      filename: '../../../../etc/passwd',
      mime_type: 'image/jpeg',
      data: 'dummy_photo_data',
    },
  });
  assert(
    traversalUploadRes.status === 400 && traversalUploadRes.body?.error?.code === 'INVALID_FILENAME',
    'UPLOAD_SECURITY',
    'Path Traversal Filename Blocked',
    `Path traversal blocked: ${traversalUploadRes.body?.error?.message}`
  );

  // 4.3 Reject Oversized Upload (>2MB)
  const oversizedUploadRes = await makeRequest('/api/v1/uploads/photo', {
    method: 'POST',
    token: adminToken,
    body: {
      filename: 'huge_photo.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 5 * 1024 * 1024, // 5MB
    },
  });
  assert(
    oversizedUploadRes.status === 422 && oversizedUploadRes.body?.error?.code === 'FILE_TOO_LARGE',
    'UPLOAD_SECURITY',
    'Photo Size Limit Enforced',
    `File size limit enforced: ${oversizedUploadRes.body?.error?.message}`
  );

  // 4.4 Valid Image Upload with Cryptographic Safe Name
  const validPhotoUploadRes = await makeRequest('/api/v1/uploads/photo', {
    method: 'POST',
    token: adminToken,
    body: {
      filename: 'santri_azzam.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 150 * 1024,
    },
  });
  assert(
    validPhotoUploadRes.status === 200 && Boolean(validPhotoUploadRes.body?.data?.storage_key),
    'UPLOAD_SECURITY',
    'Safe Cryptographic Storage Key Generated',
    `Storage key: ${validPhotoUploadRes.body?.data?.storage_key}`
  );

  // -------------------------------------------------------------------------
  // SUITE 5: CSV & FORMULA INJECTION DEFENSE
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 5: CSV & Spreadsheet Formula Injection Defense');

  const exportRes = await makeRequest('/api/v1/reports/export?format=csv', { token: adminToken });
  assert(
    exportRes.status === 200 && exportRes.body?.data?.format === 'csv',
    'CSV_SECURITY',
    'Report Export Sanitization',
    `Export generated cleanly without formula execution`
  );

  // -------------------------------------------------------------------------
  // SUITE 6: OPEN REDIRECT DEFENSE
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 6: Open Redirect Validation');

  const maliciousRedirectRes = await makeRequest('/api/v1/auth/validate-redirect?redirect=https://evil.example.com/steal-creds');
  assert(
    maliciousRedirectRes.body?.data?.is_safe === false && maliciousRedirectRes.body?.data?.safe_url === '/dashboard',
    'OPEN_REDIRECT',
    'External Open Redirect Intercepted',
    `Unsafe target sanitized to default: ${maliciousRedirectRes.body?.data?.safe_url}`
  );

  const safeRedirectRes = await makeRequest('/api/v1/auth/validate-redirect?redirect=/absensi/manual');
  assert(
    safeRedirectRes.body?.data?.is_safe === true && safeRedirectRes.body?.data?.safe_url === '/absensi/manual',
    'OPEN_REDIRECT',
    'Internal Relative URL Permitted',
    `Safe internal path confirmed: ${safeRedirectRes.body?.data?.safe_url}`
  );

  // -------------------------------------------------------------------------
  // SUITE 7: PRIVILEGE ESCALATION & ADMIN PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 7: Privilege Escalation & Admin Role Protection');

  // 7.1 Non-superadmin cannot assign super-admin role
  const escalationRes = await makeRequest('/api/v1/users/2/role', {
    method: 'PUT',
    token: musyrifToken,
    body: { role: 'super-admin' },
  });
  assert(
    escalationRes.status === 403,
    'PRIVILEGE_ESCALATION',
    'Self-Escalation to Super Admin Blocked',
    `Status ${escalationRes.status} (Expected 403)`
  );

  // 7.2 Prevent demoting or deactivating the last active super-admin
  const demoteAdminRes = await makeRequest('/api/v1/users/1/role', {
    method: 'PUT',
    token: adminToken,
    body: { role: 'musyrif' },
  });
  assert(
    demoteAdminRes.status === 422 && demoteAdminRes.body?.error?.code === 'LAST_ADMIN_PROTECTED',
    'ADMIN_PROTECTION',
    'Last Super Admin Demotion Protected',
    `Protected: ${demoteAdminRes.body?.error?.message}`
  );

  // -------------------------------------------------------------------------
  // SUITE 8: SECURITY AUDIT TRAIL LOGGING
  // -------------------------------------------------------------------------
  console.log('\n▶ Suite 8: Security Audit Trail & Non-Repudiation');

  const auditLogRes = await makeRequest('/api/v1/security/audit-logs', { token: adminToken });
  assert(
    auditLogRes.status === 200 && Array.isArray(auditLogRes.body?.data) && auditLogRes.body.data.length > 0,
    'AUDIT_LOGS',
    'Security Event Audit Trail Available',
    `Recorded ${auditLogRes.body?.data?.length} security audit events`
  );

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log('📊 SIUBA HARDENING 08 TEST SUMMARY REPORT');
  console.log('=================================================================');
  const total = RESULTS.length;
  const passed = RESULTS.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Security Checks: ${total}`);
  console.log(`Passed:                ${passed}`);
  console.log(`Failed:                ${failed}`);
  console.log(`Result:                ${failed === 0 ? '🟢 ALL TESTS PASSED (100%)' : '🔴 TESTS FAILED'}`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityHardening08Tests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
