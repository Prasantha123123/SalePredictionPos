<?php

namespace Tests\Feature\Category;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $inventoryStaff;
    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('Admin');

        $this->inventoryStaff = User::factory()->create(['is_active' => true]);
        $this->inventoryStaff->assignRole('Inventory Staff');

        $this->cashier = User::factory()->create(['is_active' => true]);
        $this->cashier->assignRole('Cashier');
    }

    public function test_authorized_user_can_view_category_list(): void
    {
        Category::create(['name' => 'Beverages', 'description' => 'Hot and cold drinks', 'is_active' => true]);
        Category::create(['name' => 'Bakery', 'description' => 'Fresh bread and pastries', 'is_active' => true]);

        $response = $this->actingAs($this->admin)->get(route('categories.index'));

        $response->assertOk();
    }

    public function test_can_create_category_with_valid_data(): void
    {
        $payload = [
            'name' => 'Dairy & Eggs',
            'description' => 'Fresh milk, butter, and farm eggs',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin)->post(route('categories.store'), $payload);

        $response->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', [
            'name' => 'Dairy & Eggs',
            'description' => 'Fresh milk, butter, and farm eggs',
            'is_active' => true,
        ]);
    }

    public function test_cannot_create_category_with_duplicate_name(): void
    {
        Category::create(['name' => 'Snacks', 'is_active' => true]);

        $response = $this->actingAs($this->admin)->post(route('categories.store'), [
            'name' => 'Snacks',
            'description' => 'Another snack entry',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('name');
        $this->assertEquals(1, Category::where('name', 'Snacks')->count());
    }

    public function test_cannot_create_category_with_empty_name(): void
    {
        $response = $this->actingAs($this->admin)->post(route('categories.store'), [
            'name' => '',
            'description' => 'Empty name test',
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('name');
    }

    public function test_can_update_category_details(): void
    {
        $category = Category::create(['name' => 'Frozen', 'description' => 'Old description', 'is_active' => true]);

        $response = $this->actingAs($this->admin)->put(route('categories.update', $category), [
            'name' => 'Frozen Foods',
            'description' => 'Ice creams and frozen vegetables',
            'is_active' => true,
        ]);

        $response->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Frozen Foods',
            'description' => 'Ice creams and frozen vegetables',
        ]);
    }

    public function test_can_toggle_category_status(): void
    {
        $category = Category::create(['name' => 'Organic Produce', 'is_active' => true]);

        $response = $this->actingAs($this->admin)->patch(route('categories.toggle-status', $category));

        $response->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'is_active' => false,
        ]);

        // Toggle back to active
        $this->actingAs($this->admin)->patch(route('categories.toggle-status', $category));
        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'is_active' => true,
        ]);
    }

    public function test_cannot_delete_category_with_associated_products(): void
    {
        $category = Category::create(['name' => 'Stationery', 'is_active' => true]);
        Product::create([
            'name' => 'Blue Ballpoint Pen',
            'sku' => 'PEN-BLUE-01',
            'barcode' => '8930001001',
            'category_id' => $category->id,
            'price' => 50.00,
            'cost' => 30.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->delete(route('categories.destroy', $category));

        $response->assertRedirect(route('categories.index'));
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_can_delete_category_without_associated_products(): void
    {
        $category = Category::create(['name' => 'Temporary Promo', 'is_active' => true]);

        $response = $this->actingAs($this->admin)->delete(route('categories.destroy', $category));

        $response->assertRedirect(route('categories.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_active_categories_returned_in_dropdown_api(): void
    {
        $activeCat = Category::create(['name' => 'Active Sweets', 'is_active' => true]);
        $inactiveCat = Category::create(['name' => 'Archived Candies', 'is_active' => false]);

        $response = $this->actingAs($this->admin)->getJson(route('categories.dropdown'));

        $response->assertOk();
        $response->assertJsonFragment(['id' => $activeCat->id, 'name' => 'Active Sweets']);
        $response->assertJsonMissing(['id' => $inactiveCat->id, 'name' => 'Archived Candies']);
    }

    public function test_product_cannot_be_created_with_inactive_category(): void
    {
        $inactiveCat = Category::create(['name' => 'Discontinued Line', 'is_active' => false]);

        $response = $this->actingAs($this->admin)->post(route('products.store'), [
            'name' => 'Discontinued Item',
            'sku' => 'DISC-001',
            'barcode' => '9999999999',
            'category_id' => $inactiveCat->id,
            'price' => 250.00,
            'cost' => 150.00,
            'is_active' => true,
        ]);

        $response->assertSessionHasErrors('category_id');
        $this->assertDatabaseMissing('products', ['sku' => 'DISC-001']);
    }

    public function test_inventory_staff_can_view_but_cannot_manage_categories(): void
    {
        $category = Category::create(['name' => 'Warehouse Pack', 'is_active' => true]);

        // Can view list
        $this->actingAs($this->inventoryStaff)->get(route('categories.index'))->assertOk();

        // Cannot create
        $this->actingAs($this->inventoryStaff)->post(route('categories.store'), [
            'name' => 'Illegal Cat',
            'is_active' => true,
        ])->assertForbidden();

        // Cannot update
        $this->actingAs($this->inventoryStaff)->put(route('categories.update', $category), [
            'name' => 'Renamed Illegal Cat',
        ])->assertForbidden();

        // Cannot delete
        $this->actingAs($this->inventoryStaff)->delete(route('categories.destroy', $category))->assertForbidden();
    }

    public function test_cashier_cannot_access_category_management(): void
    {
        $this->actingAs($this->cashier)->get(route('categories.index'))->assertForbidden();
        $this->actingAs($this->cashier)->post(route('categories.store'), [
            'name' => 'Cashier Cat',
        ])->assertForbidden();
    }
}
