<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::with('roles')
            ->latest()
            ->paginate(15);

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => Role::all(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('users/create', [
            'roles' => Role::all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $passwordRule = 'required|string|min:8';
        if ($request->has('password_confirmation')) {
            $passwordRule .= '|confirmed';
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => $passwordRule,
            'role' => 'nullable|exists:roles,name',
            'role_id' => 'nullable|exists:roles,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $roleName = $request->role;
        if (! $roleName && $request->filled('role_id')) {
            $roleName = Role::find($request->role_id)?->name;
        }
        if (! $roleName) {
            $roleName = 'Cashier';
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => bcrypt($validated['password']),
            'is_active' => $request->has('is_active') ? (bool) $request->is_active : true,
        ]);

        $user->assignRole($roleName);
        AuditService::log('user_created', 'User', $user->id, null, ['role' => $roleName]);

        return redirect()->route('users.index')
            ->with('success', "User '{$user->name}' created successfully.");
    }

    public function edit(User $user): Response
    {
        return Inertia::render('users/edit', [
            'user' => $user->load('roles'),
            'roles' => Role::all(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$user->id}",
            'phone' => 'nullable|string|max:20',
            'role' => 'nullable|exists:roles,name',
            'role_id' => 'nullable|exists:roles,id',
            'is_active' => 'sometimes|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        $oldRole = $user->getRoleNames()->first();
        $roleName = $request->role;
        if (! $roleName && $request->filled('role_id')) {
            $roleName = Role::find($request->role_id)?->name;
        }
        if (! $roleName) {
            $roleName = $oldRole;
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ];

        if ($request->has('is_active')) {
            // Prevent self-deactivation
            if (auth()->id() === $user->id && ! (bool) $request->is_active) {
                return back()->with('error', 'You cannot deactivate your own active account.');
            }
            $updateData['is_active'] = (bool) $request->is_active;
        }

        if (! empty($request->password)) {
            $updateData['password'] = bcrypt($request->password);
        }

        $user->update($updateData);

        if ($roleName) {
            $user->syncRoles([$roleName]);
        }

        AuditService::log('user_updated', 'User', $user->id, ['role' => $oldRole], ['role' => $roleName]);

        return redirect()->route('users.index')
            ->with('success', "User '{$user->name}' updated successfully.");
    }

    public function toggleStatus(User $user): RedirectResponse
    {
        if (auth()->id() === $user->id && $user->is_active) {
            return back()->with('error', 'You cannot deactivate your own active account.');
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        $statusText = $user->is_active ? 'activated' : 'deactivated';
        AuditService::log('user_status_toggled', 'User', $user->id, null, ['is_active' => $user->is_active]);

        return back()->with('success', "Staff account '{$user->name}' has been {$statusText}.");
    }

    public function destroy(User $user): RedirectResponse
    {
        if (auth()->id() === $user->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $hasSales = method_exists($user, 'sales') && $user->sales()->exists();
        $hasExpenses = method_exists($user, 'expenses') && $user->expenses()->exists();
        $hasOrders = Schema::hasTable('orders') && Schema::hasColumn('orders', 'user_id') && DB::table('orders')->where('user_id', $user->id)->exists();

        if ($hasSales || $hasExpenses || $hasOrders) {
            return back()->with('error', "Cannot delete '{$user->name}' because they have associated transactional history (sales, orders, or expenses). You can deactivate this staff member instead.");
        }

        try {
            $name = $user->name;
            $user->delete();
            AuditService::log('user_deleted', 'User', $user->id, null, ['name' => $name]);

            return redirect()->route('users.index')
                ->with('success', "Staff member '{$name}' was deleted successfully.");
        } catch (\Throwable $e) {
            return back()->with('error', "Could not delete user: " . $e->getMessage());
        }
    }
}
