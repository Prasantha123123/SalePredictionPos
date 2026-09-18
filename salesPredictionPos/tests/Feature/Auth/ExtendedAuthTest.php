<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExtendedAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => false,
        ]);

        $response = $this->post(route('login.store'), [
            'email' => 'inactive@example.com',
            'password' => 'Secret123!',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');
    }

    public function test_active_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'active@example.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);

        $response = $this->post(route('login.store'), [
            'email' => 'active@example.com',
            'password' => 'Secret123!',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_login_requires_email_and_password(): void
    {
        $response = $this->post(route('login.store'), [
            'email' => '',
            'password' => '',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors(['email', 'password']);
    }

    public function test_login_fails_with_non_existent_email(): void
    {
        $response = $this->post(route('login.store'), [
            'email' => 'nonexistent@example.com',
            'password' => 'Secret123!',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');
    }

    public function test_user_session_is_invalidated_after_logout(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->actingAs($user);
        $this->assertAuthenticatedAs($user);

        $response = $this->post(route('logout'));

        $this->assertGuest();
        $response->assertRedirect(route('home'));

        // Subsequent authenticated request is redirected to login
        $protectedResponse = $this->get(route('dashboard'));
        $protectedResponse->assertRedirect(route('login'));
    }
}
