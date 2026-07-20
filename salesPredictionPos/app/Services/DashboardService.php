<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesPrediction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function __construct(
        protected ExpiryService $expiryService
    ) {}

    /**
     * Get all KPI data for the dashboard.
     */
    public function getKpiData(): array
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $todaySales = Sale::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->sum('total');

        $yesterdaySales = Sale::whereDate('created_at', $yesterday)
            ->where('status', 'completed')
            ->sum('total');

        $todayTransactions = Sale::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->count();

        $lowStockCount = Inventory::whereColumn('quantity', '<=', 'low_stock_threshold')
            ->count();

        $tomorrowPrediction = SalesPrediction::where('prediction_date', Carbon::tomorrow())
            ->latest()
            ->first();

        // Get expiry summaries
        $expirySummary = $this->expiryService->getExpiryAlertSummary();

        return [
            'today_sales' => round((float) $todaySales, 2),
            'yesterday_sales' => round((float) $yesterdaySales, 2),
            'sales_change' => $yesterdaySales > 0
                ? round((($todaySales - $yesterdaySales) / $yesterdaySales) * 100, 1)
                : 0,
            'today_transactions' => $todayTransactions,
            'low_stock_count' => $lowStockCount,
            'predicted_tomorrow' => $tomorrowPrediction
                ? round((float) $tomorrowPrediction->predicted_amount, 2)
                : null,
            'prediction_confidence' => $tomorrowPrediction
                ? (float) $tomorrowPrediction->confidence
                : null,
            'expiry_alerts' => $expirySummary,
        ];
    }

    /**
     * Get sales trend data for the last N days.
     */
    public function getSalesTrend(int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $sales = Sale::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as total'),
                DB::raw('COUNT(*) as transactions')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        return $sales->map(fn ($row) => [
            'date' => $row->date,
            'total' => round((float) $row->total, 2),
            'transactions' => (int) $row->transactions,
        ])->values()->toArray();
    }

    /**
     * Get top selling products.
     */
    public function getTopProducts(int $limit = 5, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        return SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $startDate)
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'quantity' => (int) $row->total_qty,
                'revenue' => round((float) $row->total_revenue, 2),
            ])
            ->toArray();
    }

    /**
     * Get category distribution.
     */
    public function getCategoryDistribution(int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        return SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->where('sales.created_at', '>=', $startDate)
            ->select(
                'categories.name',
                DB::raw('SUM(sale_items.total) as total_revenue')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'value' => round((float) $row->total_revenue, 2),
            ])
            ->toArray();
    }

    /**
     * Get predictions for the next N days.
     */
    public function getPredictions(int $days = 7): array
    {
        return SalesPrediction::where('prediction_date', '>', Carbon::today())
            ->where('prediction_date', '<=', Carbon::today()->addDays($days))
            ->orderBy('prediction_date')
            ->get()
            ->map(fn ($p) => [
                'date' => $p->prediction_date->format('Y-m-d'),
                'predicted' => round((float) $p->predicted_amount, 2),
                'confidence' => (float) $p->confidence,
            ])
            ->toArray();
    }
}
