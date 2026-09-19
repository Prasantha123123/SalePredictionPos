<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Sale;

$data = Sale::where('status', 'completed')
    ->selectRaw('DATE(created_at) as date, SUM(total) as total_sales, COUNT(*) as transactions, SUM(discount_amount) as discount_amount')
    ->groupByRaw('DATE(created_at)')
    ->orderBy('date')
    ->get()
    ->map(fn($r) => [
        'date' => $r->date,
        'total_sales' => (float)$r->total_sales,
        'transactions' => (int)$r->transactions,
        'discount_amount' => (float)$r->discount_amount
    ])
    ->toArray();

file_put_contents(__DIR__ . '/ml-service/sales_history.json', json_encode($data, JSON_PRETTY_PRINT));
echo "Exported " . count($data) . " sales days to ml-service/sales_history.json\n";
