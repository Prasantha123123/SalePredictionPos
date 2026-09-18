<?php

namespace Tests\Feature\Pos;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use App\Services\SaleService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosBillingFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;
    protected Product $productA;
    protected Product $productB;
    protected InventoryBatch $batchA;
    protected InventoryBatch $batchB;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->cashier = User::factory()->create(['is_active' => true]);
        $this->cashier->assignRole('Cashier');

        $this->supplier = Supplier::create([
            'company_name' => 'Ceylon Distributors',
            'supplier_name' => 'Perera',
            'phone' => '0771234567',
        ]);

        $category = Category::create(['name' => 'Beverages', 'is_active' => true]);

        $this->productA = Product::create([
            'name' => 'Ceylon Milk Tea 500ml',
            'sku' => 'BEV-001',
            'barcode' => '4790001001',
            'category_id' => $category->id,
            'price' => 250.00,
            'cost' => 150.00,
            'is_active' => true,
            'has_expiry' => true,
        ]);

        $this->productB = Product::create([
            'name' => 'Ginger Biscuit 200g',
            'sku' => 'SNK-002',
            'barcode' => '4790001002',
            'category_id' => $category->id,
            'price' => 120.00,
            'cost' => 80.00,
            'is_active' => true,
            'has_expiry' => true,
        ]);

        $this->batchA = InventoryBatch::create([
            'product_id' => $this->productA->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-TEA-001',
            'purchase_price' => 150.00,
            'selling_price' => 250.00,
            'quantity_received' => 50,
            'available_quantity' => 50,
            'purchase_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(60)->format('Y-m-d'),
            'status' => 'active',
        ]);

        $this->batchB = InventoryBatch::create([
            'product_id' => $this->productB->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'BAT-BIS-001',
            'purchase_price' => 80.00,
            'selling_price' => 120.00,
            'quantity_received' => 30,
            'available_quantity' => 30,
            'purchase_date' => now()->format('Y-m-d'),
            'expiry_date' => now()->addDays(90)->format('Y-m-d'),
            'status' => 'active',
        ]);

        Inventory::create(['product_id' => $this->productA->id, 'quantity' => 50, 'low_stock_threshold' => 10]);
        Inventory::create(['product_id' => $this->productB->id, 'quantity' => 30, 'low_stock_threshold' => 5]);
    }

    public function test_single_item_sale_creates_records_and_deducts_inventory(): void
    {
        $this->actingAs($this->cashier);

        $payload = [
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 2,
                    'unit_price' => 250.00,
                    'discount' => 0,
                ],
            ],
        ];

        $response = $this->post(route('pos.store'), $payload);
        $response->assertRedirect(route('pos.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('sales', [
            'status' => 'completed',
            'subtotal' => 500.00,
            'total' => 500.00,
            'payment_method' => 'cash',
        ]);

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $this->productA->id,
            'batch_id' => $this->batchA->id,
            'quantity' => 2,
            'unit_price' => 250.00,
            'purchase_price' => 150.00,
            'total' => 500.00,
            'profit' => 200.00, // (250*2) - (150*2) = 200
        ]);

        $this->assertDatabaseHas('payments', [
            'method' => 'cash',
            'amount' => 500.00,
        ]);

        // Verify stock decrement
        $this->assertEquals(48, $this->batchA->fresh()->available_quantity);
        $this->assertEquals(48, Inventory::where('product_id', $this->productA->id)->first()->quantity);
    }

    public function test_multiple_item_sale_with_percentage_discount(): void
    {
        $this->actingAs($this->cashier);

        $discount = Discount::create([
            'name' => 'New Year Promo',
            'code' => 'NEWYEAR10',
            'type' => 'percentage',
            'value' => 10, // 10%
            'min_spend' => 500,
            'is_active' => true,
        ]);

        $payload = [
            'payment_method' => 'card',
            'discount_code' => 'NEWYEAR10',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 2,
                    'unit_price' => 250.00,
                ],
                [
                    'product_id' => $this->productB->id,
                    'batch_id' => $this->batchB->id,
                    'quantity' => 5,
                    'unit_price' => 120.00,
                ],
            ],
        ];

        // Subtotal = (2*250) + (5*120) = 500 + 600 = 1100.
        // Discount 10% = 110. Total = 990.
        $response = $this->post(route('pos.store'), $payload);
        $response->assertRedirect(route('pos.index'));

        $this->assertDatabaseHas('sales', [
            'subtotal' => 1100.00,
            'discount_amount' => 110.00,
            'total' => 990.00,
            'payment_method' => 'card',
        ]);

        $this->assertEquals(1, $discount->fresh()->used_count);
    }

    public function test_discount_code_below_minimum_spend_is_not_applied(): void
    {
        $this->actingAs($this->cashier);

        Discount::create([
            'name' => 'Big Spend Promo',
            'code' => 'BIGSPEND',
            'type' => 'fixed',
            'value' => 100,
            'min_spend' => 1000,
            'is_active' => true,
        ]);

        $payload = [
            'payment_method' => 'digital',
            'discount_code' => 'BIGSPEND',
            'items' => [
                [
                    'product_id' => $this->productB->id,
                    'batch_id' => $this->batchB->id,
                    'quantity' => 2, // 2 * 120 = 240 < 1000 min_spend
                    'unit_price' => 120.00,
                ],
            ],
        ];

        $this->post(route('pos.store'), $payload);

        $this->assertDatabaseHas('sales', [
            'subtotal' => 240.00,
            'discount_amount' => 0.00,
            'total' => 240.00,
        ]);
    }

    public function test_insufficient_stock_in_batch_throws_exception_and_rolls_back(): void
    {
        $this->actingAs($this->cashier);

        $initialSalesCount = Sale::count();
        $initialBatchQty = $this->batchA->fresh()->available_quantity;

        $saleService = app(SaleService::class);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Insufficient stock');

        $saleService->createSale([
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 999, // Exceeds 50
                    'unit_price' => 250.00,
                ],
            ],
        ]);

        // Verify transaction was rolled back completely
        $this->assertEquals($initialSalesCount, Sale::count());
        $this->assertEquals($initialBatchQty, $this->batchA->fresh()->available_quantity);
    }

    public function test_unique_invoice_number_format(): void
    {
        $this->actingAs($this->cashier);

        $payload = [
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 1,
                    'unit_price' => 250.00,
                ],
            ],
        ];

        $this->post(route('pos.store'), $payload);
        $this->post(route('pos.store'), $payload);

        $sales = Sale::orderBy('id', 'desc')->take(2)->get();
        $datePrefix = 'INV-' . now()->format('Ymd') . '-';

        $this->assertStringStartsWith($datePrefix, $sales[0]->invoice_number);
        $this->assertStringStartsWith($datePrefix, $sales[1]->invoice_number);
        $this->assertNotEquals($sales[0]->invoice_number, $sales[1]->invoice_number);
    }

    public function test_hold_order_creates_held_sale(): void
    {
        $this->actingAs($this->cashier);

        $payload = [
            'notes' => 'Customer stepped out for wallet',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 3,
                    'unit_price' => 250.00,
                ],
            ],
        ];

        $response = $this->post(route('pos.hold'), $payload);
        $response->assertRedirect(route('pos.index'));

        $this->assertDatabaseHas('sales', [
            'status' => 'held',
            'subtotal' => 750.00,
            'notes' => 'Customer stepped out for wallet',
        ]);

        // Stock is NOT yet deducted on hold
        $this->assertEquals(50, $this->batchA->fresh()->available_quantity);
    }

    public function test_void_sale_restores_inventory_to_batch(): void
    {
        $this->actingAs($this->cashier);

        $saleService = app(SaleService::class);
        $sale = $saleService->createSale([
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'batch_id' => $this->batchA->id,
                    'quantity' => 5,
                    'unit_price' => 250.00,
                ],
            ],
        ]);

        $this->assertEquals(45, $this->batchA->fresh()->available_quantity);

        // Void the sale
        $response = $this->post(route('pos.void', $sale));
        $response->assertRedirect(route('pos.index'));

        $this->assertEquals('voided', $sale->fresh()->status);
        // Stock restored back to 50
        $this->assertEquals(50, $this->batchA->fresh()->available_quantity);
        $this->assertEquals(50, Inventory::where('product_id', $this->productA->id)->first()->quantity);
    }
}
