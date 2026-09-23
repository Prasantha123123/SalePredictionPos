<?php

use App\Models\Sale;

$history = Sale::where('status', 'completed')
    ->where('created_at', '>=', now()->subDays(365))
    ->selectRaw('DATE(created_at) as date, SUM(total) as total_sales, COUNT(*) as transactions, SUM(discount_amount) as discount_amount')
    ->groupByRaw('DATE(created_at)')
    ->orderBy('date')
    ->get()
    ->map(fn ($row) => [
        'date' => $row->date,
        'total_sales' => (float) $row->total_sales,
        'transactions' => (int) $row->transactions,
        'discount_amount' => (float) $row->discount_amount,
    ]);

file_put_contents(base_path('fresh_sales_export.json'), $history->toJson(JSON_PRETTY_PRINT));
file_put_contents(base_path('ml-service/fresh_sales_export.json'), $history->toJson(JSON_PRETTY_PRINT));

echo "Exported " . $history->count() . " days to fresh_sales_export.json" . PHP_EOL;
