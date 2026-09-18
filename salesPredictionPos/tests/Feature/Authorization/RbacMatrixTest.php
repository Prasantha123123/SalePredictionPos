<?php

namespace Tests\Feature\Authorization;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    protected function createUserWithRole(string $roleName): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($roleName);
        return $user;
    }

    public function test_super_admin_has_full_access(): void
    {
        $user = $this->createUserWithRole('Super Admin');
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertOk();
        $this->get(route('pos.index'))->assertOk();
        $this->get(route('products.index'))->assertOk();
        $this->get(route('inventory.index'))->assertOk();
        $this->get(route('reports.index'))->assertOk();
        $this->get(route('forecasts.index'))->assertOk();
        $this->get(route('users.index'))->assertOk();
        $this->get(route('expenses.index'))->assertOk();
        $this->get(route('suppliers.index'))->assertOk();
    }

    public function test_admin_has_operational_access(): void
    {
        $user = $this->createUserWithRole('Admin');
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertOk();
        $this->get(route('pos.index'))->assertOk();
        $this->get(route('products.index'))->assertOk();
        $this->get(route('inventory.index'))->assertOk();
        $this->get(route('reports.index'))->assertOk();
        $this->get(route('forecasts.index'))->assertOk();
        $this->get(route('users.index'))->assertOk();
        $this->get(route('expenses.index'))->assertOk();
        $this->get(route('suppliers.index'))->assertOk();
    }

    public function test_manager_access_and_restrictions(): void
    {
        $user = $this->createUserWithRole('Manager');
        $this->actingAs($user);

        // Permitted
        $this->get(route('dashboard'))->assertOk();
        $this->get(route('reports.index'))->assertOk();
        $this->get(route('forecasts.index'))->assertOk();
        $this->get(route('expenses.index'))->assertOk();
        $this->get(route('suppliers.index'))->assertOk();
        $this->get(route('customers.index'))->assertOk();

        // Forbidden
        $this->get(route('pos.index'))->assertForbidden();
        $this->get(route('products.index'))->assertForbidden();
        $this->get(route('inventory.index'))->assertForbidden();
        $this->get(route('users.index'))->assertForbidden();
    }

    public function test_inventory_staff_access_and_restrictions(): void
    {
        $user = $this->createUserWithRole('Inventory Staff');
        $this->actingAs($user);

        // Permitted
        $this->get(route('dashboard'))->assertOk();
        $this->get(route('inventory.index'))->assertOk();
        $this->get(route('suppliers.index'))->assertOk();

        // Forbidden
        $this->get(route('pos.index'))->assertForbidden();
        $this->get(route('products.index'))->assertForbidden();
        $this->get(route('reports.index'))->assertForbidden();
        $this->get(route('forecasts.index'))->assertForbidden();
        $this->get(route('users.index'))->assertForbidden();
        $this->get(route('expenses.index'))->assertForbidden();
        $this->get(route('customers.index'))->assertForbidden();
    }

    public function test_cashier_access_and_restrictions(): void
    {
        $user = $this->createUserWithRole('Cashier');
        $this->actingAs($user);

        // Permitted
        $this->get(route('dashboard'))->assertOk();
        $this->get(route('pos.index'))->assertOk();
        $this->get(route('customers.index'))->assertOk();

        // Forbidden
        $this->get(route('products.index'))->assertForbidden();
        $this->get(route('inventory.index'))->assertForbidden();
        $this->get(route('reports.index'))->assertForbidden();
        $this->get(route('forecasts.index'))->assertForbidden();
        $this->get(route('users.index'))->assertForbidden();
        $this->get(route('expenses.index'))->assertForbidden();
        $this->get(route('suppliers.index'))->assertForbidden();
    }

    public function test_developer_has_testing_dashboard_access_and_admin_forbidden(): void
    {
        $dev = $this->createUserWithRole('Developer');
        $this->actingAs($dev);
        $this->get(route('testing.dashboard'))->assertOk();

        $admin = $this->createUserWithRole('Admin');
        $this->actingAs($admin);
        $this->get(route('testing.dashboard'))->assertForbidden();
    }
}
