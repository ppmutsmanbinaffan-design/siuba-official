<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        // 1. Query real database User by username OR email
        $user = User::where('username', $username)
            ->orWhere('email', $username)
            ->first();

        // 2. User not found -> 401
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password tidak sesuai.'
            ], 401);
        }

        // 3. Verify password hash against database
        if (!Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password tidak sesuai.'
            ], 401);
        }

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

        // 6. Issue real Laravel Sanctum token
        $user->tokens()->delete();
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

        if (empty($password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password wajib diisi.'
            ], 422);
        }

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

        $user->password = $password; // 'hashed' cast in User model auto-hashes
        $user->save();

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

        return in_array('super-admin', $roles, true) ||
               in_array('super_admin', $roles, true) ||
               $user->hasRole('super-admin') ||
               $user->hasRole('super_admin') ||
               $user->id === 1 ||
               $user->username === 'superadmin';
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

        // Check if role modification was requested
        $requestedRoles = $this->extractRolesFromRequest($request);
        if ($requestedRoles !== null) {
            $authUser = $request->user();
            if (!$this->isSuperAdmin($authUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya Super Admin yang memiliki hak akses untuk mengatur dan mengubah role pengguna.'
                ], 403);
            }

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
        $password = trim((string) $request->input('password', 'password'));
        $email = trim((string) $request->input('email', "{$username}@utsman.sch.id"));

        if (empty($username) || empty($name)) {
            return response()->json([
                'success' => false,
                'message' => 'Nama dan username wajib diisi.'
            ], 422);
        }

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

        $user = User::updateOrCreate(
            ['username' => $username],
            [
                'name' => $name,
                'email' => $email,
                'password' => $password, // 'hashed' cast in User model auto-hashes
                'is_active' => (bool) $request->input('is_active', true),
            ]
        );

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

        if ($targetUser->id === 1 || $targetUser->username === 'superadmin') {
            return response()->json(['success' => false, 'message' => 'Akun Super Admin Master tidak dapat dihapus.'], 403);
        }

        $targetUser->delete();
        return response()->json(['success' => true, 'message' => "Pengguna @{$targetUser->username} berhasil dihapus."]);
    }
}
