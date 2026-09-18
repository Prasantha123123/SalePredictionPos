<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_with_permission_can_visit_the_dashboard()
    {
        Permission::create(['name' => 'view-dashboard']);
        $user = User::factory()->create();
        $user->givePermissionTo('view-dashboard');

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_authenticated_users_without_permission_are_forbidden()
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertForbidden();
    }

    public function test_testing_dashboard_renders_and_exports_csv_for_authorized_users()
    {
        Permission::firstOrCreate(['name' => 'view-testing-dashboard']);
        $user = User::factory()->create();
        $user->givePermissionTo('view-testing-dashboard');

        $this->actingAs($user);

        $response = $this->get(route('testing.dashboard'));
        $response->assertOk();

        $exportResponse = $this->get(route('testing.export', ['format' => 'csv']));
        $exportResponse->assertOk();
        $exportResponse->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_testing_dashboard_is_forbidden_for_regular_users()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('testing.dashboard'))->assertForbidden();
    }
}
