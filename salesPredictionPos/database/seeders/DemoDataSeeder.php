<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Expense;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesPrediction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // Create demo users with roles
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@smartpos.lk'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'),
                'phone' => '+94771234567',
                'is_active' => true,
            ]
        );
        $superAdmin->assignRole('Super Admin');

        $admin = User::firstOrCreate(
            ['email' => 'admin@smartpos.lk'],
            [
                'name' => 'Kamal Perera',
                'password' => bcrypt('password'),
                'phone' => '+94772345678',
                'is_active' => true,
            ]
        );
        $admin->assignRole('Admin');

        $manager = User::firstOrCreate(
            ['email' => 'manager@smartpos.lk'],
            [
                'name' => 'Nimal Silva',
                'password' => bcrypt('password'),
                'phone' => '+94773456789',
                'is_active' => true,
            ]
        );
        $manager->assignRole('Manager');

        $cashier = User::firstOrCreate(
            ['email' => 'cashier@smartpos.lk'],
            [
                'name' => 'Saman Fernando',
                'password' => bcrypt('password'),
                'phone' => '+94774567890',
                'is_active' => true,
            ]
        );
        $cashier->assignRole('Cashier');

        // Categories
        $categories = [
            ['name' => 'Beverages', 'description' => 'Hot and cold drinks, juices, and water'],
            ['name' => 'Snacks', 'description' => 'Chips, biscuits, and quick bites'],
            ['name' => 'Groceries', 'description' => 'Daily essentials and cooking ingredients'],
            ['name' => 'Bakery', 'description' => 'Fresh bread, cakes, and pastries'],
            ['name' => 'Household', 'description' => 'Cleaning supplies and household items'],
            ['name' => 'Dairy', 'description' => 'Milk, yogurt, cheese, and dairy products'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // Products with realistic Sri Lankan prices
        $products = [
            // Beverages
            ['name' => 'Ceylon Tea (100g)', 'sku' => 'BEV-001', 'category' => 'Beverages', 'price' => 350, 'cost' => 250],
            ['name' => 'Fresh Lime Juice', 'sku' => 'BEV-002', 'category' => 'Beverages', 'price' => 180, 'cost' => 80],
            ['name' => 'Bottled Water (500ml)', 'sku' => 'BEV-003', 'category' => 'Beverages', 'price' => 80, 'cost' => 45],
            ['name' => 'Coca-Cola (330ml)', 'sku' => 'BEV-004', 'category' => 'Beverages', 'price' => 200, 'cost' => 140],
            ['name' => 'King Coconut Water', 'sku' => 'BEV-005', 'category' => 'Beverages', 'price' => 150, 'cost' => 80],
            ['name' => 'Iced Coffee', 'sku' => 'BEV-006', 'category' => 'Beverages', 'price' => 450, 'cost' => 180],

            // Snacks
            ['name' => 'Munchee Lemon Puff', 'sku' => 'SNK-001', 'category' => 'Snacks', 'price' => 120, 'cost' => 85],
            ['name' => 'Tipi Tip Chips', 'sku' => 'SNK-002', 'category' => 'Snacks', 'price' => 100, 'cost' => 65],
            ['name' => 'Cream Cracker Biscuits', 'sku' => 'SNK-003', 'category' => 'Snacks', 'price' => 250, 'cost' => 180],
            ['name' => 'Isso Vadei (5pcs)', 'sku' => 'SNK-004', 'category' => 'Snacks', 'price' => 300, 'cost' => 150],
            ['name' => 'Fish Rolls (3pcs)', 'sku' => 'SNK-005', 'category' => 'Snacks', 'price' => 360, 'cost' => 200],

            // Groceries
            ['name' => 'Basmati Rice (1kg)', 'sku' => 'GRC-001', 'category' => 'Groceries', 'price' => 580, 'cost' => 420],
            ['name' => 'Coconut Oil (750ml)', 'sku' => 'GRC-002', 'category' => 'Groceries', 'price' => 850, 'cost' => 650],
            ['name' => 'Red Lentils (500g)', 'sku' => 'GRC-003', 'category' => 'Groceries', 'price' => 380, 'cost' => 280],
            ['name' => 'Sugar (1kg)', 'sku' => 'GRC-004', 'category' => 'Groceries', 'price' => 290, 'cost' => 220],
            ['name' => 'Wheat Flour (1kg)', 'sku' => 'GRC-005', 'category' => 'Groceries', 'price' => 240, 'cost' => 170],
            ['name' => 'Curry Powder (100g)', 'sku' => 'GRC-006', 'category' => 'Groceries', 'price' => 180, 'cost' => 120],

            // Bakery
            ['name' => 'White Bread Loaf', 'sku' => 'BKR-001', 'category' => 'Bakery', 'price' => 220, 'cost' => 140],
            ['name' => 'Chocolate Cake Slice', 'sku' => 'BKR-002', 'category' => 'Bakery', 'price' => 350, 'cost' => 180],
            ['name' => 'Croissant', 'sku' => 'BKR-003', 'category' => 'Bakery', 'price' => 280, 'cost' => 150],
            ['name' => 'Chicken Bun', 'sku' => 'BKR-004', 'category' => 'Bakery', 'price' => 150, 'cost' => 80],
            ['name' => 'Fish Bun', 'sku' => 'BKR-005', 'category' => 'Bakery', 'price' => 130, 'cost' => 70],

            // Household
            ['name' => 'Washing Powder (1kg)', 'sku' => 'HLD-001', 'category' => 'Household', 'price' => 650, 'cost' => 480],
            ['name' => 'Dish Soap (500ml)', 'sku' => 'HLD-002', 'category' => 'Household', 'price' => 320, 'cost' => 220],
            ['name' => 'Floor Cleaner (1L)', 'sku' => 'HLD-003', 'category' => 'Household', 'price' => 480, 'cost' => 340],
            ['name' => 'Toilet Paper (4 rolls)', 'sku' => 'HLD-004', 'category' => 'Household', 'price' => 550, 'cost' => 380],

            // Dairy
            ['name' => 'Fresh Milk (1L)', 'sku' => 'DRY-001', 'category' => 'Dairy', 'price' => 380, 'cost' => 290],
            ['name' => 'Curd (400g)', 'sku' => 'DRY-002', 'category' => 'Dairy', 'price' => 250, 'cost' => 170],
            ['name' => 'Butter (250g)', 'sku' => 'DRY-003', 'category' => 'Dairy', 'price' => 680, 'cost' => 520],
            ['name' => 'Cheese Slice (200g)', 'sku' => 'DRY-004', 'category' => 'Dairy', 'price' => 750, 'cost' => 580],
        ];

        $categoryMap = Category::pluck('id', 'name');

        foreach ($products as $p) {
            $product = Product::firstOrCreate(
                ['sku' => $p['sku']],
                [
                    'name' => $p['name'],
                    'sku' => $p['sku'],
                    'category_id' => $categoryMap[$p['category']],
                    'price' => $p['price'],
                    'cost' => $p['cost'],
                    'is_active' => true,
                ]
            );

            // Create inventory record with random stock
            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                [
                    'quantity' => rand(5, 200),
                    'low_stock_threshold' => rand(5, 20),
                ]
            );

            // Initial stock-in movement
            InventoryMovement::create([
                'product_id' => $product->id,
                'type' => 'in',
                'quantity' => $product->inventory->quantity,
                'reference' => 'INITIAL-STOCK',
                'notes' => 'Initial stock setup',
                'user_id' => $admin->id,
            ]);
        }

        // Customers
        $customers = [
            ['name' => 'Chaminda Jayawardena', 'phone' => '+94775001001', 'email' => 'chaminda@email.com', 'address' => '42 Galle Road, Colombo 03'],
            ['name' => 'Dilini Wickramasinghe', 'phone' => '+94775001002', 'email' => 'dilini@email.com', 'address' => '15 Temple Road, Kandy'],
            ['name' => 'Ruwan Bandara', 'phone' => '+94775001003', 'email' => 'ruwan@email.com', 'address' => '78 Main Street, Galle'],
            ['name' => 'Anusha Kumari', 'phone' => '+94775001004', 'email' => 'anusha@email.com', 'address' => '23 Lake Drive, Nuwara Eliya'],
            ['name' => 'Pradeep Gunaratne', 'phone' => '+94775001005', 'email' => 'pradeep@email.com', 'address' => '56 Station Road, Matara'],
            ['name' => 'Malini de Silva', 'phone' => '+94775001006', 'email' => 'malini@email.com', 'address' => '89 Flower Road, Colombo 07'],
            ['name' => 'Ajith Ratnayake', 'phone' => '+94775001007', 'email' => null, 'address' => '12 Pagoda Road, Nugegoda'],
            ['name' => 'Sanduni Perera', 'phone' => '+94775001008', 'email' => null, 'address' => null],
            ['name' => 'Tharindu Herath', 'phone' => '+94775001009', 'email' => 'tharindu@email.com', 'address' => '34 Hill Street, Kurunegala'],
            ['name' => 'Nimali Fernando', 'phone' => '+94775001010', 'email' => 'nimali@email.com', 'address' => '67 Beach Road, Negombo'],
        ];

        foreach ($customers as $c) {
            Customer::firstOrCreate(['phone' => $c['phone']], $c);
        }

        // Discounts
        $discounts = [
            ['code' => 'WELCOME10', 'name' => 'Welcome Discount', 'type' => 'percentage', 'value' => 10, 'min_spend' => 500, 'is_active' => true],
            ['code' => 'FLAT100', 'name' => 'Flat Rs.100 Off', 'type' => 'fixed', 'value' => 100, 'min_spend' => 1000, 'is_active' => true],
            ['code' => 'WEEKEND15', 'name' => 'Weekend Special', 'type' => 'percentage', 'value' => 15, 'min_spend' => 2000, 'is_active' => true],
        ];

        foreach ($discounts as $d) {
            Discount::firstOrCreate(['code' => $d['code']], $d);
        }

        // Generate 90 days of sales history
        $this->generateSalesHistory($admin, $cashier, 90);

        // Generate expenses
        $this->generateExpenses($admin, $manager, 90);

        // Generate predictions
        $this->generatePredictions();
    }

    private function generateSalesHistory(User $admin, User $cashier, int $days): void
    {
        $products = Product::with('inventory')->get();
        $customers = Customer::all();
        $sellers = [$admin, $cashier];
        $paymentMethods = ['cash', 'card', 'digital'];

        for ($day = $days; $day >= 0; $day--) {
            $date = Carbon::now()->subDays($day);
            $isWeekend = $date->isWeekend();
            $salesCount = $isWeekend ? rand(8, 18) : rand(5, 12);

            for ($s = 0; $s < $salesCount; $s++) {
                $itemCount = rand(1, 6);
                $selectedProducts = $products->random(min($itemCount, $products->count()));
                $seller = $sellers[array_rand($sellers)];
                $customer = rand(1, 100) > 40 ? $customers->random() : null;

                $subtotal = 0;
                $items = [];

                foreach ($selectedProducts as $product) {
                    $qty = rand(1, 4);
                    $itemTotal = $product->price * $qty;
                    $subtotal += $itemTotal;

                    $items[] = [
                        'product_id' => $product->id,
                        'quantity' => $qty,
                        'unit_price' => $product->price,
                        'discount' => 0,
                        'total' => $itemTotal,
                    ];
                }

                $discountAmount = rand(1, 100) > 80 ? round($subtotal * 0.1, 2) : 0;
                $total = $subtotal - $discountAmount;

                $sale = Sale::create([
                    'invoice_number' => 'INV-' . $date->format('Ymd') . '-' . str_pad($s + 1, 3, '0', STR_PAD_LEFT),
                    'customer_id' => $customer?->id,
                    'user_id' => $seller->id,
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'tax_amount' => 0,
                    'total' => $total,
                    'payment_method' => $paymentMethods[array_rand($paymentMethods)],
                    'status' => 'completed',
                    'created_at' => $date->copy()->setTime(rand(8, 20), rand(0, 59)),
                    'updated_at' => $date->copy()->setTime(rand(8, 20), rand(0, 59)),
                ]);

                foreach ($items as $item) {
                    SaleItem::create(array_merge($item, ['sale_id' => $sale->id]));
                }

                Payment::create([
                    'sale_id' => $sale->id,
                    'method' => $sale->payment_method,
                    'amount' => $total,
                    'created_at' => $sale->created_at,
                    'updated_at' => $sale->updated_at,
                ]);
            }
        }
    }

    private function generateExpenses(User $admin, User $manager, int $days): void
    {
        $expenseCategories = ['Rent', 'Utilities', 'Supplies', 'Salary', 'Transport', 'Maintenance'];

        for ($day = $days; $day >= 0; $day -= rand(1, 5)) {
            $date = Carbon::now()->subDays($day);
            $user = rand(0, 1) ? $admin : $manager;

            Expense::create([
                'category' => $expenseCategories[array_rand($expenseCategories)],
                'description' => 'Business expense - ' . Str::random(8),
                'amount' => rand(500, 25000),
                'date' => $date,
                'user_id' => $user->id,
                'created_at' => $date,
                'updated_at' => $date,
            ]);
        }
    }

    private function generatePredictions(): void
    {
        // Generate some historical predictions for the past 14 days
        for ($day = 14; $day >= 1; $day--) {
            $date = Carbon::now()->subDays($day);
            $actualSales = Sale::whereDate('created_at', $date)->sum('total');
            $variance = rand(-15, 15) / 100;
            $predicted = $actualSales > 0 ? $actualSales * (1 + $variance) : rand(30000, 60000);

            SalesPrediction::create([
                'prediction_date' => $date,
                'predicted_amount' => round($predicted, 2),
                'actual_amount' => $actualSales > 0 ? $actualSales : null,
                'model_used' => 'xgboost',
                'confidence' => rand(75, 95),
                'created_at' => $date->copy()->subDay(),
                'updated_at' => $date->copy()->subDay(),
            ]);
        }

        // Generate future predictions (tomorrow + next 7 days)
        for ($day = 1; $day <= 7; $day++) {
            $date = Carbon::now()->addDays($day);
            SalesPrediction::create([
                'prediction_date' => $date,
                'predicted_amount' => rand(35000, 65000),
                'model_used' => 'xgboost',
                'confidence' => rand(70, 90),
            ]);
        }
    }
}
