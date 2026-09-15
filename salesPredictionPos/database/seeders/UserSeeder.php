<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::firstOrCreate(
            ["email" => "superadmin@smartpos.lk"],
            [
                "name" => "Super Admin",
                "password" => bcrypt("password"),
                "phone" => "+94771234567",
                "is_active" => true,
            ]
        );
        $superAdmin->assignRole("Super Admin");

        $admin = User::firstOrCreate(
            ["email" => "admin@smartpos.lk"],
            [
                "name" => "VibeArc Admin",
                "password" => bcrypt("password"),
                "phone" => "+94772345678",
                "is_active" => true,
            ]
        );
        $admin->assignRole("Admin");

        $manager = User::firstOrCreate(
            ["email" => "manager@smartpos.lk"],
            [
                "name" => "Cafe Manager",
                "password" => bcrypt("password"),
                "phone" => "+94773456789",
                "is_active" => true,
            ]
        );
        $manager->assignRole("Manager");

        $cashier = User::firstOrCreate(
            ["email" => "cashier@smartpos.lk"],
            [
                "name" => "VibeArc Cashier",
                "password" => bcrypt("password"),
                "phone" => "+94774567890",
                "is_active" => true,
            ]
        );
        $cashier->assignRole("Cashier");

        $this->command->info('Users seeded successfully!');
        $this->command->info('Login credentials:');
        $this->command->info('  Super Admin: superadmin@smartpos.lk / password');
        $this->command->info('  Admin:       admin@smartpos.lk / password');
        $this->command->info('  Manager:     manager@smartpos.lk / password');
        $this->command->info('  Cashier:     cashier@smartpos.lk / password');
    }
}
