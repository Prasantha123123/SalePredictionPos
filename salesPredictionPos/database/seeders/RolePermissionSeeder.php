<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()['cache']->forget(config('permission.cache.key'));

        // Create permissions
        $permissions = [
            'create-sale',
            'view-dashboard',
            'manage-products',
            'manage-inventory',
            'manage-users',
            'view-reports',
            'view-forecast',
            'manage-expenses',
            'manage-discounts',
            'manage-customers',
            'view-audit-logs',
            'view-suppliers',
            'manage-suppliers',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->givePermissionTo([
            'create-sale',
            'view-dashboard',
            'manage-products',
            'manage-inventory',
            'manage-users',
            'view-reports',
            'view-forecast',
            'manage-expenses',
            'manage-discounts',
            'manage-customers',
            'view-audit-logs',
            'view-suppliers',
            'manage-suppliers',
        ]);

        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $manager->givePermissionTo([
            'view-dashboard',
            'view-reports',
            'view-forecast',
            'manage-expenses',
            'manage-customers',
            'view-suppliers',
            'manage-suppliers', // Manager can create/edit suppliers, but cannot delete (we will enforce deletion restriction in the controller)
        ]);

        $inventoryStaff = Role::firstOrCreate(['name' => 'Inventory Staff']);
        $inventoryStaff->givePermissionTo([
            'view-dashboard',
            'manage-inventory',
            'view-suppliers',
        ]);

        $cashier = Role::firstOrCreate(['name' => 'Cashier']);
        $cashier->givePermissionTo([
            'view-dashboard',
            'create-sale',
            'manage-customers',
        ]);
    }
}
