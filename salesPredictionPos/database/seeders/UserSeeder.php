<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure roles and permissions exist first
        $this->call(RolePermissionSeeder::class);

        // 2. Seed default users with explicit IDs for foreign-key compatibility
        $users = [
            [
                'id' => 1,
                'name' => 'Super Admin',
                'email' => 'superadmin@smartpos.lk',
                'password' => Hash::make('password'),
                'phone' => '+94771234567',
                'is_active' => true,
                'role' => 'Super Admin',
            ],
            [
                'id' => 2,
                'name' => 'System Admin',
                'email' => 'admin@smartpos.lk',
                'password' => Hash::make('password'),
                'phone' => '+94772345678',
                'is_active' => true,
                'role' => 'Admin',
            ],
            [
                'id' => 3,
                'name' => 'Store Manager',
                'email' => 'manager@smartpos.lk',
                'password' => Hash::make('password'),
                'phone' => '+94773456789',
                'is_active' => true,
                'role' => 'Manager',
            ],
            [
                'id' => 4,
                'name' => 'Store Cashier',
                'email' => 'cashier@smartpos.lk',
                'password' => Hash::make('password'),
                'phone' => '+94774567890',
                'is_active' => true,
                'role' => 'Cashier',
            ],
            [
                'id' => 5,
                'name' => 'Developer',
                'email' => 'developer@smartpos.lk',
                'password' => Hash::make('password'),
                'phone' => '+94770000000',
                'is_active' => true,
                'role' => 'Developer',
            ],
        ];

        foreach ($users as $userData) {
            $role = $userData['role'];
            unset($userData['role']);

            $user = User::updateOrCreate(
                ['id' => $userData['id']],
                $userData
            );

            $user->syncRoles([$role]);
        }

        $this->command->info('Users and roles seeded successfully! (Super Admin ID: 1 created)');
    }
}
