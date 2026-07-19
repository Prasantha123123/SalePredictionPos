<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => bcrypt($validated['password']),
            'is_active' => true,
        ]);

        $user->assignRole($validated['role']);
        AuditService::log('user_created', 'User', $user->id, null, ['role' => $validated['role']]);

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
            'role' => 'required|exists:roles,name',
            'is_active' => 'boolean',
        ]);

        $oldRole = $user->getRoleNames()->first();
        $user->update($validated);
        $user->syncRoles([$validated['role']]);

        AuditService::log('user_updated', 'User', $user->id, ['role' => $oldRole], ['role' => $validated['role']]);

        return redirect()->route('users.index')
            ->with('success', "User '{$user->name}' updated successfully.");
    }
}
