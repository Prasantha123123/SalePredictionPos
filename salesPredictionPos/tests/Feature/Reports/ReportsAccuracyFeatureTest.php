<?php

namespace Tests\Feature\Reports;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReportsAccuracyFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected Product $product1;
    protected Product $product2;
    protected Category $category;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->manager = User::factory()->create(['is_active' => true]);
        $this->manager->assignRole('Manager');

        $this->customer = Customer::create([
            'name' => 'Nimal Jayawardena',
            'email' => 'nimal@example.com',
            'phone' => '0779998888',
        ]);

        $this->category = Category::create(['name' => 'Stationery', 'is_active' => true]);

        $this->product1 = Product::create([
            'name' => 'CR Book 120 Pages',
            'sku' => 'ST-CR-120',
            'category_id' => $this->category->id,
            'price' => 300.00,
            'cost' => 200.00,
            'is_active' => true,
        ]);

        $this->product2 = Product::create([
            'name' => 'Blue Ballpoint Pen Box',
            'sku' => 'ST-PEN-BOX',
            'category_id' => $this->category->id,
            'price' => 500.00,
            'cost' => 350.00,
            'is_active' => true,
        ]);

        $supplier = Supplier::create([
            'company_name' => 'Atlas Axillia',
            'supplier_name' => 'Kumara',
            'phone' => '0112345678',
        ]);

        $batch1 = InventoryBatch::create([
            'product_id' => $this->product1->id,
            'supplier_id' => $supplier->id,
            'batch_number' => 'BAT-CR-001',
            'purchase_price' => 200.00,
            'selling_price' => 300.00,
            'quantity_received' => 100,
            'available_quantity' => 100,
            'purchase_date' => now()->format('Y-m-d'),
            'status' => 'active',
        ]);

        $batch2 = InventoryBatch::create([
            'product_id' => $this->product2->id,
            'supplier_id' => $supplier->id,
            'batch_number' => 'BAT-PEN-001',
            'purchase_price' => 350.00,
            'selling_price' => 500.00,
            'quantity_received' => 50,
            'available_quantity' => 50,
            'purchase_date' => now()->format('Y-m-d'),
            'status' => 'active',
        ]);

        Inventory::create(['product_id' => $this->product1->id, 'quantity' => 100, 'low_stock_threshold' => 10]);
        Inventory::create(['product_id' => $this->product2->id, 'quantity' => 50, 'low_stock_threshold' => 5]);

        // Create completed sale
        $sale = Sale::create([
            'invoice_number' => 'INV-20260916-001',
            'customer_id' => $this->customer->id,
            'user_id' => $this->manager->id,
            'subtotal' => 1100.00,
            'discount_amount' => 50.00,
            'tax_amount' => 0.00,
            'total' => 1050.00,
            'payment_method' => 'cash',
            'status' => 'completed',
            'created_at' => now(),
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->product1->id,
            'batch_id' => $batch1->id,
            'quantity' => 2,
            'unit_price' => 300.00,
            'purchase_price' => 200.00,
            'selling_price' => 300.00,
            'total' => 600.00,
            'profit' => 200.00, // (300*2) - (200*2) = 200
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->product2->id,
            'batch_id' => $batch2->id,
            'quantity' => 1,
            'unit_price' => 500.00,
            'purchase_price' => 350.00,
            'selling_price' => 500.00,
            'total' => 500.00,
            'profit' => 150.00, // (500*1) - (350*1) = 150
        ]);

        Payment::create([
            'sale_id' => $sale->id,
            'method' => 'cash',
            'amount' => 1050.00,
        ]);
    }

    public function test_reports_index_is_accessible_by_manager(): void
    {
        $this->actingAs($this->manager);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
    }

    public function test_daily_sales_report_endpoint(): void
    {
        $this->actingAs($this->manager);

        $response = $this->get(route('reports.daily-sales', [
            'start_date' => now()->subDay()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
        ]));

        $response->assertOk();
    }

    public function test_product_sales_report_endpoint(): void
    {
        $this->actingAs($this->manager);

        $response = $this->get(route('reports.product-sales', [
            'start_date' => now()->subDay()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
        ]));

        $response->assertOk();
    }

    public function test_category_sales_report_endpoint(): void
    {
        $this->actingAs($this->manager);

        $response = $this->get(route('reports.category-sales'));
        $response->assertOk();
    }

    public function test_profit_sales_report_endpoint(): void
    {
        $this->actingAs($this->manager);

        $response = $this->get(route('reports.profit-sales'));
        $response->assertOk();
    }

    public function test_invoice_details_report(): void
    {
        $this->actingAs($this->manager);

        $sale = Sale::first();
        $response = $this->get(route('reports.show-invoice', $sale));

        $response->assertOk();
    }

    public function test_empty_date_range_handles_gracefully(): void
    {
        $this->actingAs($this->manager);

        // Date range in future where no sales exist
        $response = $this->get(route('reports.daily-sales', [
            'start_date' => '2099-01-01',
            'end_date' => '2099-01-31',
        ]));

        $response->assertOk();
    }
}
