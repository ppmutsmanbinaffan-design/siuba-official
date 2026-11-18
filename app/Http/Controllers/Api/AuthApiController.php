<?php

namespace App\Http\Controllers\Api;

use App\Support\SecurityPolicy;
use Illuminate\Support\Facades\RateLimiter;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class AuthApiController extends Controller
{
    /**
     * Authenticate user credentials and issue a real Laravel Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $username = trim((string) $request->input('username', ''));
        $password = trim((string) $request->input('password', ''));

        if (empty($username) || empty($password)) {
            return response()->json([
                'success' => false,
                'message' => 'Username/email dan kata sandi wajib diisi.'
            ], 422);
        }

        // Penguncian per akun setelah beberapa kali gagal (Kebijakan Keamanan)
        $lockKey = 'login-account:' . sha1(mb_strtolower($username));
        $maxAttempts = max(1, SecurityPolicy::int('max_login_attempts_before_lockout', 5));
        if (RateLimiter::tooManyAttempts($lockKey, $maxAttempts)) {
            $minutes = (int) ceil(RateLimiter::availableIn($lockKey) / 60);

            return response()->json([
                'success' => false,
                'message' => "Akun dikunci sementara karena terlalu banyak percobaan login gagal. Coba lagi dalam {$minutes} menit.",
            ], 429);
        }
        $failed = function () use ($lockKey, $username) {
            RateLimiter::hit($lockKey, max(1, SecurityPolicy::int('lockout_duration_minutes', 15)) * 60);
            try {
                // Dicatat untuk Keamanan & Audit (jumlah login gagal hari ini); kata sandi tidak pernah disimpan
                \App\Services\Security\AuditService::log(event: 'auth.login_failed', newValues: ['username' => mb_substr($username, 0, 100)], reason: 'Login gagal');
            } catch (\Throwable) {
                // pencatatan tidak boleh mengganggu respons login
            }

            return response()->json([
                'success' => false,
                'message' => 'Username atau password tidak sesuai.'
            ], 401);
        };

        // 1. Query real database User by username OR email
        $user = User::where('username', $username)
            ->orWhere('email', $username)
            ->first();

        // 2. User not found -> 401
        if (!$user) {
            return $failed();
        }

        // 3. Verify password hash against database
        if (!Hash::check($password, $user->password)) {
            return $failed();
        }
        RateLimiter::clear($lockKey);

        // 4. Verify account is active -> 403
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak aktif.'
            ], 403);
        }

        // 5. Update last login timestamp
        $user->update([
            'last_login_at' => now(),
        ]);

        // 6. Issue real Laravel Sanctum token (sesi lain diakhiri bila kebijakan melarang sesi ganda)
        if (!SecurityPolicy::bool('allow_concurrent_sessions')) {
            $user->tokens()->delete();
        }
        $token = $user->createToken('siuba-web')->plainTextToken;

        // 7. Load Spatie roles and permissions
        $roles = $user->getRoleNames();
        $permissions = $user->getAllPermissions()->pluck('name');
        $permissionArray = $permissions->toArray();

        // Wildcard access for super-admin
        if ($roles->contains('super-admin') || $roles->contains('super_admin')) {
            if (!in_array('*', $permissionArray)) {
                $permissionArray[] = '*';
            }
        }

        $safeUserData = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'roles' => $roles,
            'role' => $roles->first() ?? 'user',
            'permissions' => $permissionArray,
            'is_active' => (bool) $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString() ?? $user->last_login_at,
        ];

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $safeUserData,
            'message' => 'Login berhasil.'
        ], 200);
    }

    /**
     * Get current authenticated user profile and permissions from Sanctum token.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        $roles = $user->getRoleNames();
        $permissions = $user->getAllPermissions()->pluck('name');
        $permissionArray = $permissions->toArray();

        if ($roles->contains('super-admin') || $roles->contains('super_admin')) {
            if (!in_array('*', $permissionArray)) {
                $permissionArray[] = '*';
            }
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'roles' => $roles,
                'role' => $roles->first() ?? 'user',
                'permissions' => $permissionArray,
                'is_active' => (bool) $user->is_active,
                'last_login_at' => $user->last_login_at?->toISOString() ?? $user->last_login_at,
            ]
        ], 200);
    }

    /**
     * Invalidate current Sanctum session token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.'
        ], 200);
    }

    /**
     * Update user password in database immediately.
     */
    public function updatePassword(Request $request, $id): JsonResponse
    {
        $password = trim((string) $request->input('password', ''));
        $username = trim((string) $request->input('username', ''));

        $request->validate([
            'password' => ['required', 'string', SecurityPolicy::passwordRule()],
        ], [
            'password.min' => SecurityPolicy::passwordHint(),
            'password.numbers' => SecurityPolicy::passwordHint(),
            'password.symbols' => SecurityPolicy::passwordHint(),
        ]);

        // Find user by ID or by username
        $user = is_numeric($id) ? User::find((int) $id) : null;
        if (!$user && !empty($username)) {
            $user = User::where('username', $username)->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Data pengguna tidak ditemukan.'
            ], 404);
        }

        if ($denied = $this->denyIfProtectedTarget($request->user(), $user)) {
            return $denied;
        }

        $user->password = $password; // 'hashed' cast in User model auto-hashes
        $user->save();

        // Paksa logout semua sesi lama milik user tsb (kecuali bila user mengganti password-nya sendiri)
        if ($request->user()?->id !== $user->id) {
            $user->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => "Password untuk @{$user->username} berhasil disimpan dan dapat langsung digunakan untuk login.",
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
            ]
        ], 200);
    }

    /**
     * Determine if a user has Super Admin authority.
     */
    public static function isSuperAdmin(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();

        // Hanya berdasarkan ROLE. (Dulu juga id === 1 / username 'superadmin' -> rawan disalahgunakan.)
        return in_array('super-admin', $roles, true) || in_array('super_admin', $roles, true);
    }

    /**
     * Admin biasa tidak boleh mengubah / menghapus akun Super Admin.
     */
    private function denyIfProtectedTarget(?User $actor, User $target): ?JsonResponse
    {
        if (self::isSuperAdmin($target) && !self::isSuperAdmin($actor)) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang dapat mengubah akun Super Admin.'
            ], 403);
        }

        return null;
    }

    /**
     * Extract normalized role list from request.
     */
    private function extractRolesFromRequest(Request $request): ?array
    {
        $roleInputs = [];

        if ($request->has('roles')) {
            $raw = $request->input('roles');
            if (is_array($raw)) {
                $roleInputs = $raw;
            } elseif (is_string($raw)) {
                $roleInputs = explode(',', $raw);
            }
        } elseif ($request->filled('role')) {
            $raw = (string) $request->input('role');
            if (str_contains($raw, ',')) {
                $roleInputs = explode(',', $raw);
            } else {
                $roleInputs = [$raw];
            }
        } else {
            return null; // Roles not provided in request payload
        }

        $cleaned = [];
        foreach ($roleInputs as $r) {
            $trimmed = trim((string) $r);
            if ($trimmed !== '') {
                $cleaned[] = $trimmed;
            }
        }

        return array_values(array_unique($cleaned));
    }

    /**
     * Update user profile, status, credentials & multiple roles.
     * Note: Only Super Admin can change user roles!
     */
    public function updateUser(Request $request, $id): JsonResponse
    {
        $user = is_numeric($id) ? User::find((int) $id) : null;
        $username = trim((string) $request->input('username', ''));

        if (!$user && !empty($username)) {
            $user = User::where('username', $username)->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Data pengguna tidak ditemukan.'
            ], 404);
        }

        if ($denied = $this->denyIfProtectedTarget($request->user(), $user)) {
            return $denied;
        }

        $request->validate([
            'name' => 'sometimes|string|max:150',
            'email' => ['sometimes', 'nullable', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user->id)],
            'is_active' => 'sometimes|boolean',
            'password' => ['nullable', 'string', SecurityPolicy::passwordRule()],
        ]);

        // Cek hak ubah role SEBELUM menyimpan apa pun (dulu data tersimpan dulu baru ditolak)
        $requestedRoles = $this->extractRolesFromRequest($request);
        if ($requestedRoles !== null && !self::isSuperAdmin($request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki hak akses untuk mengatur dan mengubah role pengguna.'
            ], 403);
        }

        if ($request->has('is_active') && !$request->boolean('is_active') && $request->user()?->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.'], 422);
        }

        if ($request->has('name')) {
            $user->name = (string) $request->input('name');
        }
        if ($request->has('email')) {
            $user->email = (string) $request->input('email');
        }
        if ($request->has('is_active')) {
            $user->is_active = (bool) $request->input('is_active');
        }
        if ($request->filled('password')) {
            $user->password = (string) $request->input('password'); // 'hashed' cast auto-hashes
        }

        $user->save();

        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        if ($requestedRoles !== null) {
            // Sync multiple roles (ensure only valid system roles are synced)
            if (!empty($requestedRoles)) {
                $validRoles = Role::whereIn('name', $requestedRoles)->pluck('name')->unique()->toArray();
                if (!empty($validRoles)) {
                    $user->syncRoles($validRoles);
                }
            } else {
                $user->syncRoles([]);
            }
        }

        $roleNames = $user->getRoleNames();

        return response()->json([
            'success' => true,
            'message' => "Data pengguna @{$user->username} berhasil diperbarui.",
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'roles' => $roleNames,
                'role' => $roleNames->first() ?? 'user',
                'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            ]
        ], 200);
    }

    /**
     * Create new user with multiple roles.
     * Note: Only Super Admin can assign roles during user creation!
     */
    public function createUser(Request $request): JsonResponse
    {
        $username = trim((string) $request->input('username', ''));
        $name = trim((string) $request->input('name', ''));
        $password = trim((string) $request->input('password', ''));
        $email = trim((string) ($request->input('email') ?: "{$username}@utsman.sch.id"));

        $request->merge(['username' => $username, 'name' => $name, 'email' => $email]);
        $request->validate([
            'name' => 'required|string|max:150',
            // username harus BARU: endpoint ini tidak lagi bisa menimpa akun yang sudah ada
            'username' => 'required|string|max:60|alpha_dash|unique:users,username',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => ['required', 'string', SecurityPolicy::passwordRule()],
        ], [
            'username.unique' => 'Username sudah digunakan.',
            'email.unique' => 'Email sudah digunakan.',
            'password.required' => 'Password wajib diisi (minimal 8 karakter).',
            'password.min' => SecurityPolicy::passwordHint(),
            'password.numbers' => SecurityPolicy::passwordHint(),
            'password.symbols' => SecurityPolicy::passwordHint(),
        ]);

        $requestedRoles = $this->extractRolesFromRequest($request);

        // If specific roles were provided, ensure the creator is Super Admin
        if ($requestedRoles !== null && count($requestedRoles) > 0) {
            $authUser = $request->user();
            if (!$this->isSuperAdmin($authUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya Super Admin yang memiliki hak akses untuk mengatur dan mengubah role pengguna.'
                ], 403);
            }
        } else {
            // Default role if none specified
            $requestedRoles = ['guru'];
        }

        $user = User::create([
            'username' => $username,
            'name' => $name,
            'email' => $email,
            'password' => $password, // 'hashed' cast in User model auto-hashes
            'is_active' => (bool) $request->input('is_active', true),
        ]);

        $validRoles = Role::whereIn('name', $requestedRoles)->pluck('name')->unique()->toArray();
        if (!empty($validRoles)) {
            $user->syncRoles($validRoles);
        }

        $roleNames = $user->getRoleNames();

        return response()->json([
            'success' => true,
            'message' => "Pengguna @{$user->username} berhasil didaftarkan.",
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'roles' => $roleNames,
                'role' => $roleNames->first() ?? 'user',
                'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            ]
        ], 201);
    }

    /**
     * Dedicated endpoint to assign multiple roles to a user (Super Admin Only).
     */
    public function assignRoles(Request $request, $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$this->isSuperAdmin($authUser)) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki hak akses untuk mengatur dan mengubah role pengguna.'
            ], 403);
        }

        $user = is_numeric($id) ? User::find((int) $id) : null;
        if (!$user) {
            $username = trim((string) $request->input('username', ''));
            if ($username !== '') {
                $user = User::where('username', $username)->first();
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Data pengguna tidak ditemukan.'
            ], 404);
        }

        $requestedRoles = $this->extractRolesFromRequest($request) ?? [];
        $validRoles = Role::whereIn('name', $requestedRoles)->pluck('name')->unique()->toArray();
        $user->syncRoles($validRoles);

        $roleNames = $user->getRoleNames();

        return response()->json([
            'success' => true,
            'message' => "Role untuk pengguna @{$user->username} berhasil diperbarui.",
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'roles' => $roleNames,
                'role' => $roleNames->first() ?? 'user',
                'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            ]
        ], 200);
    }

    /**
     * List all available system roles with their assigned permissions.
     */
    public function listRoles(): JsonResponse
    {
        $roles = Role::with('permissions')->where('guard_name', 'web')->get();
        return response()->json([
            'success' => true,
            'roles' => $roles
        ], 200);
    }

    /**
     * List all users with their assigned roles and permissions.
     */
    public function listUsers(): JsonResponse
    {
        $users = User::orderBy('id', 'asc')->get()->map(function ($u) {
            $roles = $u->getRoleNames();
            $permissions = $u->getAllPermissions()->pluck('name');
            return [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'email' => $u->email,
                'role' => $roles->first() ?? 'user',
                'roles' => $roles->toArray(),
                'permissions' => $permissions->toArray(),
                'is_active' => (bool) $u->is_active,
                'last_login_at' => $u->last_login_at ? $u->last_login_at->format('Y-m-d H:i:s') : null,
            ];
        });

        return response()->json([
            'success' => true,
            'users' => $users
        ], 200);
    }

    /**
     * Delete user from system.
     */
    public function deleteUser(Request $request, $id): JsonResponse
    {
        $targetUser = User::find((int) $id);
        if (!$targetUser) {
            return response()->json(['success' => false, 'message' => 'Pengguna tidak ditemukan.'], 404);
        }

        if ($request->user()?->id === $targetUser->id) {
            return response()->json(['success' => false, 'message' => 'Anda tidak dapat menghapus akun Anda sendiri.'], 422);
        }

        if (self::isSuperAdmin($targetUser)) {
            if (!self::isSuperAdmin($request->user())) {
                return response()->json(['success' => false, 'message' => 'Akun Super Admin hanya dapat dihapus oleh Super Admin.'], 403);
            }
            if (User::role('super-admin')->count() <= 1) {
                return response()->json(['success' => false, 'message' => 'Super Admin terakhir tidak dapat dihapus.'], 422);
            }
        }

        $targetUser->tokens()->delete();
        $targetUser->delete();
        return response()->json(['success' => true, 'message' => "Pengguna @{$targetUser->username} berhasil dihapus."]);
    }
}
