<?php

require __DIR__ . '/../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Services\SaleService;
use App\Services\AIAssistantService;

echo "=== SalesPredictionPos Performance Benchmarking Suite ===\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "OS: " . PHP_OS . " (" . php_uname('s') . " " . php_uname('r') . ")\n";

$dbConnection = config('database.default');
$dbDriver = config("database.connections.{$dbConnection}.driver");
$productCount = DB::table('products')->count();
$salesCount = DB::table('sales')->count();
$saleItemsCount = DB::table('sale_items')->count();

echo "Database Connection: {$dbConnection} ({$dbDriver})\n";
echo "Dataset Size: {$productCount} products, {$salesCount} sales, {$saleItemsCount} sale items\n\n";

function calculateStats(array $times): array
{
    if (empty($times)) {
        return ['min' => 0, 'max' => 0, 'avg' => 0, 'median' => 0, 'p95' => 0, 'count' => 0];
    }
    sort($times);
    $count = count($times);
    $min = min($times);
    $max = max($times);
    $avg = array_sum($times) / $count;

    $mid = (int) floor($count / 2);
    $median = ($count % 2 === 0) ? ($times[$mid - 1] + $times[$mid]) / 2 : $times[$mid];

    $p95Index = (int) ceil(0.95 * $count) - 1;
    $p95 = $times[max(0, min($p95Index, $count - 1))];

    return [
        'min' => round($min, 2),
        'max' => round($max, 2),
        'avg' => round($avg, 2),
        'median' => round($median, 2),
        'p95' => round($p95, 2),
        'count' => $count,
    ];
}

$results = [];

// 1. Database Query Benchmarks (Repeated 20 iterations each)
echo "Running Database Query Benchmarks...\n";

// 1.1 Product Search by Name / Barcode (Catalog of 13k+ items)
$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 20; $i++) {
    $searchKey = ($i % 2 === 0) ? 'Book' : 'Pen';
    $t0 = microtime(true);
    try {
        $res = DB::table('products')
            ->where('name', 'like', "%{$searchKey}%")
            ->orWhere('barcode', 'like', "%{$searchKey}%")
            ->limit(20)
            ->get();
        $elapsed = (microtime(true) - $t0) * 1000;
        $times[] = $elapsed;
        $success++;
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['db_product_search'] = [
    'name' => 'Database: Product Search (13k catalog)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 1.2 Sales Aggregation Query (Daily sum across 25k+ sales)
$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 20; $i++) {
    $t0 = microtime(true);
    try {
        $res = DB::table('sales')
            ->where('status', 'completed')
            ->selectRaw('DATE(created_at) as sale_date, SUM(total) as daily_total, COUNT(*) as count')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('sale_date', 'desc')
            ->limit(30)
            ->get();
        $elapsed = (microtime(true) - $t0) * 1000;
        $times[] = $elapsed;
        $success++;
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['db_sales_aggregation'] = [
    'name' => 'Database: 30-Day Sales Aggregation (25k sales)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 1.3 Top Selling Products Query (Joined across 53k sale items)
$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 20; $i++) {
    $t0 = microtime(true);
    try {
        $res = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select('products.name', DB::raw('SUM(sale_items.quantity) as total_qty'), DB::raw('SUM(sale_items.total) as total_revenue'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get();
        $elapsed = (microtime(true) - $t0) * 1000;
        $times[] = $elapsed;
        $success++;
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['db_top_products'] = [
    'name' => 'Database: Top 10 Products by Revenue (53k items join)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 2. AI Assistant Intent & Database Query Layer Benchmark
echo "Running AI Assistant Processing Benchmarks...\n";
$aiService = app(AIAssistantService::class);
$queries = [
    'how much did i earn today',
    'show me top selling items',
    'any low stock items',
    'which products are expired',
    'tell me today expense',
];
$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 20; $i++) {
    $q = $queries[$i % count($queries)];
    $t0 = microtime(true);
    try {
        $detected = $aiService->detectIntent($q);
        $elapsed = (microtime(true) - $t0) * 1000;
        $times[] = $elapsed;
        $success++;
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['ai_intent_detection'] = [
    'name' => 'AI Assistant: Intent Detection & Routing',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 3. FastAPI Microservice Benchmarks
echo "Running FastAPI Microservice Benchmarks...\n";
$fastApiBase = 'http://127.0.0.1:8001';

// 3.1 /health
$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 20; $i++) {
    $t0 = microtime(true);
    try {
        $res = Http::timeout(2)->get("{$fastApiBase}/health");
        if ($res->successful()) {
            $times[] = (microtime(true) - $t0) * 1000;
            $success++;
        } else {
            $fail++;
        }
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['fastapi_health'] = [
    'name' => 'FastAPI: GET /health',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 3.2 /predict (Recursive 30-day forecast)
$times = [];
$success = 0;
$fail = 0;
$predictPayload = [
    'last_known' => [
        'date' => date('Y-m-d', strtotime('-1 day')),
        'total_sales' => 48500.0,
        'transactions' => 35,
        'discount_amount' => 500.0,
    ],
    'days' => 30,
];

for ($i = 0; $i < 15; $i++) {
    $t0 = microtime(true);
    try {
        $res = Http::timeout(10)->post("{$fastApiBase}/predict", $predictPayload);
        if ($res->successful()) {
            $times[] = (microtime(true) - $t0) * 1000;
            $success++;
        } else {
            $fail++;
        }
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['fastapi_predict'] = [
    'name' => 'FastAPI: POST /predict (30-day recursive forecast)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 3.3 /train (Model training on 30-day window)
$times = [];
$success = 0;
$fail = 0;
// Sample history
$trainHistory = [];
$baseDate = strtotime('-30 days');
for ($d = 0; $d < 30; $d++) {
    $trainHistory[] = [
        'date' => date('Y-m-d', $baseDate + ($d * 86400)),
        'total_sales' => (float) rand(20000, 65000),
        'transactions' => rand(15, 60),
        'discount_amount' => (float) rand(0, 2000),
    ];
}

for ($i = 0; $i < 5; $i++) {
    $t0 = microtime(true);
    try {
        $res = Http::timeout(30)->post("{$fastApiBase}/train", ['history' => $trainHistory]);
        if ($res->successful()) {
            $times[] = (microtime(true) - $t0) * 1000;
            $success++;
        } else {
            $fail++;
        }
    } catch (\Throwable $e) {
        $fail++;
    }
}
$results['fastapi_train'] = [
    'name' => 'FastAPI: POST /train (XGBoost/RF/Linear fit & selection)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

// 4. POS Sale Transaction Performance (In-Memory / Isolated Rollback Benchmark)
echo "Running End-to-End Sale Creation Benchmarks...\n";
$saleService = app(SaleService::class);
$user = User::first() ?: User::factory()->create();
$product = Product::first();
$supplier = \App\Models\Supplier::first() ?: \App\Models\Supplier::create([
    'company_name' => 'Benchmark Supplier',
    'supplier_name' => 'Benchmark',
    'phone' => '0770000000',
]);
$supplierId = $supplier->id;

\Illuminate\Support\Facades\Auth::login($user);
Inventory::firstOrCreate(['product_id' => $product->id], ['quantity' => 1000, 'low_stock_threshold' => 10]);

$batch = InventoryBatch::create([
    'product_id' => $product->id,
    'supplier_id' => $supplierId,
    'batch_number' => 'PERF-TEST-' . uniqid(),
    'purchase_price' => 100.0,
    'selling_price' => 150.0,
    'quantity_received' => 1000,
    'available_quantity' => 1000,
    'purchase_date' => date('Y-m-d'),
    'status' => 'active',
]);

$times = [];
$success = 0;
$fail = 0;
for ($i = 0; $i < 15; $i++) {
    $t0 = microtime(true);
    try {
        DB::beginTransaction();
        $sale = $saleService->createSale([
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $product->id,
                    'batch_id' => $batch->id,
                    'quantity' => 1,
                    'unit_price' => 150.0,
                ],
            ],
        ]);
        // Rollback immediately to maintain clean state
        DB::rollBack();
        $elapsed = (microtime(true) - $t0) * 1000;
        $times[] = $elapsed;
        $success++;
    } catch (\Throwable $e) {
        DB::rollBack();
        echo "POS Sale error: " . $e->getMessage() . "\n";
        $fail++;
    }
}
// Clean up perf batch
$batch->delete();

$results['pos_sale_transaction'] = [
    'name' => 'POS: Complete Sale Transaction Cycle (Stock deduct + movement + payment + audit)',
    'stats' => calculateStats($times),
    'success' => $success,
    'failed' => $fail,
];

echo "\n=== PERFORMANCE BENCHMARK RESULTS ===\n";
printf("%-45s | %8s | %8s | %8s | %8s | %8s | %5s\n", "Operation", "Min(ms)", "Avg(ms)", "Med(ms)", "P95(ms)", "Max(ms)", "Count");
echo str_repeat('-', 98) . "\n";

foreach ($results as $key => $item) {
    $s = $item['stats'];
    printf(
        "%-45s | %8.2f | %8.2f | %8.2f | %8.2f | %8.2f | %5d\n",
        substr($item['name'], 0, 45),
        $s['min'],
        $s['avg'],
        $s['median'],
        $s['p95'],
        $s['max'],
        $s['count']
    );
}

// Save results to json
$outputPath = __DIR__ . '/performance_benchmark_results.json';
file_put_contents($outputPath, json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'environment' => [
        'php_version' => PHP_VERSION,
        'os' => PHP_OS . " (" . php_uname('s') . " " . php_uname('r') . ")",
        'database' => $dbConnection,
        'driver' => $dbDriver,
        'catalog_products' => $productCount,
        'total_sales' => $salesCount,
        'total_sale_items' => $saleItemsCount,
    ],
    'benchmarks' => $results,
], JSON_PRETTY_PRINT));

echo "\nBenchmark results saved to: {$outputPath}\n";
