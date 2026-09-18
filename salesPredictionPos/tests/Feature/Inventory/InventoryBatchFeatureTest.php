<?php

namespace Tests\Feature\Inventory;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Services\ExpiryService;
use App\Services\InventoryService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class InventoryBatchFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $inventoryStaff;
    protected Product $product;
    protected Supplier $supplier;
    protected InventoryService $inventoryService;
    protected ExpiryService $expiryService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->inventoryStaff = User::factory()->create(['is_active' => true]);
        $this->inventoryStaff->assignRole('Inventory Staff');

        $this->supplier = Supplier::create([
            'company_name' => 'Lanka Milk Foods',
            'supplier_name' => 'Silva',
            'phone' => '0719876543',
        ]);

        $category = Category::create(['name' => 'Dairy', 'is_active' => true]);

        $this->product = Product::create([
            'name' => 'Highland Full Cream Milk 1L',
            'sku' => 'DAI-MILK-1L',
            'barcode' => '4791002001',
            'category_id' => $category->id,
            'price' => 520.00,
            'cost' => 450.00,
            'is_active' => true,
            'has_expiry' => true,
        ]);

        $this->inventoryService = app(InventoryService::class);
        $this->expiryService = app(ExpiryService::class);
    }

    public function test_add_stock_creates_batch_movement_and_syncs_inventory(): void
    {
        $this->actingAs($this->inventoryStaff);

        $movement = $this->inventoryService->addStock(
            productId: $this->product->id,
            quantity: 100,
            reference: 'PO-2026-001',
            notes: 'First delivery',
            supplierId: $this->supplier->id,
            purchasePrice: 450.00,
            sellingPrice: 520.00,
            expiryDate: now()->addDays(90)->format('Y-m-d')
        );

        $this->assertDatabaseHas('inventory_batches', [
            'product_id' => $this->product->id,
            'quantity_received' => 100,
            'available_quantity' => 100,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('inventory', [
            'product_id' => $this->product->id,
            'quantity' => 100,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $this->product->id,
            'type' => 'in',
            'quantity' => 100,
            'reference' => 'PO-2026-001',
        ]);
    }

    public function test_fefo_deducts_from_earliest_expiring_batch_first(): void
    {
        $this->actingAs($this->inventoryStaff);

        // Batch 1 expires in 10 days (earliest)
        $batch1 = InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-EXP-EARLY',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 20,
            'available_quantity' => 20,
            'expiry_date' => now()->addDays(10)->format('Y-m-d'),
            'status' => 'active',
        ]);

        // Batch 2 expires in 60 days (later)
        $batch2 = InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-EXP-LATER',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 30,
            'available_quantity' => 30,
            'expiry_date' => now()->addDays(60)->format('Y-m-d'),
            'status' => 'active',
        ]);

        Inventory::create([
            'product_id' => $this->product->id,
            'quantity' => 50,
            'low_stock_threshold' => 10,
        ]);

        // Deduct 25 units: 20 should come from batch1 (depleting it), and 5 from batch2
        $consumed = $this->inventoryService->removeStock($this->product->id, 25, 'SALE-TEST', 'FEFO test');

        $this->assertEquals(0, $batch1->fresh()->available_quantity);
        $this->assertEquals('depleted', $batch1->fresh()->status);

        $this->assertEquals(25, $batch2->fresh()->available_quantity);
        $this->assertEquals('active', $batch2->fresh()->status);

        $this->assertEquals(25, Inventory::where('product_id', $this->product->id)->first()->quantity);

        $this->assertCount(2, $consumed);
        $this->assertEquals($batch1->id, $consumed[0]['batch_id']);
        $this->assertEquals(20, $consumed[0]['quantity']);
        $this->assertEquals($batch2->id, $consumed[1]['batch_id']);
        $this->assertEquals(5, $consumed[1]['quantity']);
    }

    public function test_expiry_alerts_categorization(): void
    {
        $today = Carbon::today();

        // Expired batch
        InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-EXPIRED',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 5,
            'available_quantity' => 5,
            'expiry_date' => $today->copy()->subDays(2)->format('Y-m-d'),
            'status' => 'active',
        ]);

        // Expiring today
        InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-TODAY',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 8,
            'available_quantity' => 8,
            'expiry_date' => $today->format('Y-m-d'),
            'status' => 'active',
        ]);

        // Expiring in 2 days (within 3 days)
        InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-3DAYS',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 12,
            'available_quantity' => 12,
            'expiry_date' => $today->copy()->addDays(2)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $alerts = $this->expiryService->getExpiryAlertSummary();

        $this->assertEquals(5, $alerts['expired']);
        $this->assertEquals(8, $alerts['expiring_today']);
        $this->assertEquals(12, $alerts['expiring_3_days']);
        $this->assertEquals(3, $alerts['total_alerts']);
    }

    public function test_low_stock_detection(): void
    {
        Inventory::create([
            'product_id' => $this->product->id,
            'quantity' => 4,
            'low_stock_threshold' => 10,
        ]);

        $lowStockItems = $this->inventoryService->getLowStockItems();

        $this->assertCount(1, $lowStockItems);
        $this->assertEquals($this->product->id, $lowStockItems->first()->product_id);
    }

    public function test_stock_adjustment_force_sets_new_quantity(): void
    {
        $this->actingAs($this->inventoryStaff);

        InventoryBatch::create([
            'product_id' => $this->product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-INITIAL',
            'purchase_price' => 450.00,
            'selling_price' => 520.00,
            'quantity_received' => 15,
            'available_quantity' => 15,
            'status' => 'active',
        ]);

        Inventory::create([
            'product_id' => $this->product->id,
            'quantity' => 15,
            'low_stock_threshold' => 10,
        ]);

        // Adjust to 40 (increase by 25)
        $movement = $this->inventoryService->adjustStock($this->product->id, 40, 'Physical audit count');

        $this->assertEquals(40, Inventory::where('product_id', $this->product->id)->first()->quantity);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $this->product->id,
            'type' => 'adjustment',
            'quantity' => 25,
            'reference' => 'ADJUSTMENT',
        ]);
    }
}
