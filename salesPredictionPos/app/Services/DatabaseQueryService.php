<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Centralized read-only query layer for the AI Assistant.
 *
 * Every public method returns a structured array of data.
 * Only SELECT operations are performed — no INSERT/UPDATE/DELETE.
 * All queries use Eloquent or Query Builder with parameterized bindings.
 */
class DatabaseQueryService
{
    // ─────────────────────────────────────────────────────────
    //  PRODUCT QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * High-level product statistics.
     */
    public function getProductsSummary(): array
    {
        return [
            'total_products'    => Product::where('is_active', true)->count(),
            'total_categories'  => Category::where('is_active', true)->count(),
            'inactive_products' => Product::where('is_active', false)->count(),
        ];
    }

    /**
     * Search a product by name (partial match) and return details.
     */
    public function getProductDetails(string $name): array
    {
        $products = Product::with('category', 'inventory')
            ->where('name', 'like', '%' . $name . '%')
            ->where('is_active', true)
            ->select('id', 'name', 'sku', 'price', 'cost', 'category_id', 'has_expiry')
            ->limit(10)
            ->get();

        return $products->map(fn ($p) => [
            'name'      => $p->name,
            'sku'       => $p->sku,
            'price'     => round((float) $p->price, 2),
            'cost'      => round((float) $p->cost, 2),
            'category'  => $p->category?->name ?? 'Uncategorized',
            'stock'     => $p->inventory?->quantity ?? 0,
            'has_expiry' => $p->has_expiry,
        ])->toArray();
    }

    /**
     * Products where stock is at or below the low-stock threshold.
     */
    public function getLowStockProducts(int $limit = 15): array
    {
        return Inventory::with('product:id,name,sku,price')
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->where('quantity', '>', 0)
            ->orderBy('quantity', 'asc')
            ->limit($limit)
            ->get()
            ->filter(fn ($inv) => $inv->product !== null)
            ->map(fn ($inv) => [
                'name'      => $inv->product->name,
                'sku'       => $inv->product->sku,
                'stock'     => $inv->quantity,
                'threshold' => $inv->low_stock_threshold,
            ])
            ->values()
            ->toArray();
    }

    /**
     * Products with zero stock.
     */
    public function getOutOfStockProducts(int $limit = 15): array
    {
        return Inventory::with('product:id,name,sku')
            ->where('quantity', '<=', 0)
            ->limit($limit)
            ->get()
            ->filter(fn ($inv) => $inv->product !== null)
            ->map(fn ($inv) => [
                'name' => $inv->product->name,
                'sku'  => $inv->product->sku,
            ])
            ->values()
            ->toArray();
    }

    /**
     * List products belonging to a named category.
     */
    public function getProductsByCategory(string $categoryName): array
    {
        $category = Category::where('name', 'like', '%' . $categoryName . '%')
            ->where('is_active', true)
            ->first();

        if (! $category) {
            return [];
        }

        return Product::where('category_id', $category->id)
            ->where('is_active', true)
            ->select('name', 'sku', 'price')
            ->limit(20)
            ->get()
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────
    //  SALES QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * Sales aggregates for an arbitrary date range.
     */
    public function getSalesSummary(Carbon $start, Carbon $end): array
    {
        $stats = Sale::where('status', 'completed')
            ->whereBetween('created_at', [$start->startOfDay(), $end->endOfDay()])
            ->selectRaw('
                COALESCE(SUM(total), 0)   as revenue,
                COUNT(*)                  as order_count,
                COALESCE(AVG(total), 0)   as avg_order,
                COALESCE(SUM(discount_amount), 0) as total_discounts
            ')
            ->first();

        // Top product in the period
        $topProduct = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select('products.name', DB::raw('SUM(sale_items.quantity) as qty'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(1)
            ->first();

        return [
            'revenue'         => round((float) $stats->revenue, 2),
            'order_count'     => (int) $stats->order_count,
            'avg_order'       => round((float) $stats->avg_order, 2),
            'total_discounts' => round((float) $stats->total_discounts, 2),
            'top_product'     => $topProduct ? $topProduct->name . ' (' . (int) $topProduct->qty . ' sold)' : 'N/A',
        ];
    }

    public function getTodaySales(): array
    {
        return $this->getSalesSummary(Carbon::today(), Carbon::today());
    }

    public function getYesterdaySales(): array
    {
        return $this->getSalesSummary(Carbon::yesterday(), Carbon::yesterday());
    }

    public function getWeeklySales(): array
    {
        return $this->getSalesSummary(Carbon::now()->startOfWeek(), Carbon::now());
    }

    public function getLastWeekSales(): array
    {
        return $this->getSalesSummary(Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek());
    }

    public function getMonthlySales(): array
    {
        return $this->getSalesSummary(Carbon::now()->startOfMonth(), Carbon::now());
    }

    public function getLastMonthSales(): array
    {
        return $this->getSalesSummary(Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth());
    }

    public function getYearlySales(): array
    {
        return $this->getSalesSummary(Carbon::now()->startOfYear(), Carbon::now());
    }

    /**
     * Revenue breakdown by payment method.
     */
    public function getRevenueByPaymentMethod(Carbon $start, Carbon $end): array
    {
        return Sale::where('status', 'completed')
            ->whereBetween('created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select('payment_method', DB::raw('SUM(total) as revenue'), DB::raw('COUNT(*) as orders'))
            ->groupBy('payment_method')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'method'  => ucfirst($row->payment_method),
                'revenue' => round((float) $row->revenue, 2),
                'orders'  => (int) $row->orders,
            ])
            ->toArray();
    }

    /**
     * Identify the hour of day with the most sales (last 30 days).
     */
    public function getPeakSalesHour(): array
    {
        return Sale::where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->select(DB::raw('HOUR(created_at) as hour'), DB::raw('COUNT(*) as order_count'), DB::raw('SUM(total) as revenue'))
            ->groupBy(DB::raw('HOUR(created_at)'))
            ->orderByDesc('order_count')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'hour'        => sprintf('%02d:00 – %02d:59', $row->hour, $row->hour),
                'order_count' => (int) $row->order_count,
                'revenue'     => round((float) $row->revenue, 2),
            ])
            ->toArray();
    }

    /**
     * Identify the day of week with the most sales (last 30 days).
     */
    public function getPeakSalesDay(): array
    {
        return Sale::where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->select(DB::raw('DAYNAME(created_at) as day_name'), DB::raw('COUNT(*) as order_count'), DB::raw('SUM(total) as revenue'))
            ->groupBy(DB::raw('DAYNAME(created_at)'))
            ->orderByDesc('order_count')
            ->limit(7)
            ->get()
            ->map(fn ($row) => [
                'day'         => $row->day_name,
                'order_count' => (int) $row->order_count,
                'revenue'     => round((float) $row->revenue, 2),
            ])
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────
    //  ANALYTICS QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * Best-selling products by quantity in a date range.
     */
    public function getTopSellingProducts(int $limit = 10, ?Carbon $start = null, ?Carbon $end = null): array
    {
        $start = $start ?? Carbon::now()->subDays(30);
        $end   = $end   ?? Carbon::now();

        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'name'     => $row->name,
                'quantity' => (int) $row->total_qty,
                'revenue'  => round((float) $row->total_revenue, 2),
            ])
            ->toArray();
    }

    /**
     * Worst-selling products by quantity in a date range.
     */
    public function getWorstSellingProducts(int $limit = 10, ?Carbon $start = null, ?Carbon $end = null): array
    {
        $start = $start ?? Carbon::now()->subDays(30);
        $end   = $end   ?? Carbon::now();

        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_qty', 'asc')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'name'     => $row->name,
                'quantity' => (int) $row->total_qty,
                'revenue'  => round((float) $row->total_revenue, 2),
            ])
            ->toArray();
    }

    /**
     * Most profitable products by total profit.
     */
    public function getMostProfitableProducts(int $limit = 10, ?Carbon $start = null, ?Carbon $end = null): array
    {
        $start = $start ?? Carbon::now()->subDays(30);
        $end   = $end   ?? Carbon::now();

        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.profit) as total_profit'),
                DB::raw('SUM(sale_items.total) as total_revenue'),
                DB::raw('SUM(sale_items.quantity) as total_qty')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_profit')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'name'    => $row->name,
                'profit'  => round((float) $row->total_profit, 2),
                'revenue' => round((float) $row->total_revenue, 2),
                'quantity' => (int) $row->total_qty,
            ])
            ->toArray();
    }

    /**
     * Revenue breakdown by product category.
     */
    public function getRevenueByCategory(?Carbon $start = null, ?Carbon $end = null): array
    {
        $start = $start ?? Carbon::now()->subDays(30);
        $end   = $end   ?? Carbon::now();

        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->select(
                'categories.name',
                DB::raw('SUM(sale_items.total) as revenue'),
                DB::raw('SUM(sale_items.quantity) as quantity'),
                DB::raw('SUM(sale_items.profit) as profit')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->name,
                'revenue'  => round((float) $row->revenue, 2),
                'quantity' => (int) $row->quantity,
                'profit'   => round((float) $row->profit, 2),
            ])
            ->toArray();
    }

    /**
     * Monthly sales data for chart rendering.
     */
    public function getMonthlySalesChart(): array
    {
        $results = Sale::where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subMonths(12))
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"))
            ->orderBy('month')
            ->get();

        return [
            'type'   => 'bar',
            'labels' => $results->pluck('month')->toArray(),
            'values' => $results->pluck('revenue')->map(fn ($v) => round((float) $v, 2))->toArray(),
        ];
    }

    // ─────────────────────────────────────────────────────────
    //  CUSTOMER QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * Customer overview statistics.
     */
    public function getCustomersSummary(): array
    {
        $total = Customer::count();

        $topCustomer = Customer::withCount('sales')
            ->orderByDesc('sales_count')
            ->limit(1)
            ->first();

        return [
            'total_customers'    => $total,
            'top_customer_name'  => $topCustomer?->name ?? 'N/A',
            'top_customer_sales' => $topCustomer?->sales_count ?? 0,
        ];
    }

    /**
     * Most frequent customer by completed sale count.
     */
    public function getMostFrequentCustomer(): array
    {
        $customer = Customer::select('customers.id', 'customers.name', 'customers.phone')
            ->join('sales', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.status', 'completed')
            ->groupBy('customers.id', 'customers.name', 'customers.phone')
            ->selectRaw('COUNT(sales.id) as total_orders, SUM(sales.total) as total_spent')
            ->orderByDesc('total_orders')
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'name'         => $c->name,
                'phone'        => $c->phone,
                'total_orders' => (int) $c->total_orders,
                'total_spent'  => round((float) $c->total_spent, 2),
            ])
            ->toArray();

        return $customer;
    }

    /**
     * Retrieve the purchase history of a specific customer by name.
     */
    public function getCustomerPurchaseHistory(string $name): array
    {
        $customer = Customer::where('name', 'like', '%' . $name . '%')->first();

        if (! $customer) {
            return [];
        }

        $sales = Sale::where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'customer' => [
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
            ],
            'purchases' => $sales->map(fn ($s) => [
                'invoice_number' => $s->invoice_number,
                'total' => round((float) $s->total, 2),
                'date' => $s->created_at->format('Y-m-d H:i'),
                'payment_method' => ucfirst($s->payment_method),
            ])->toArray(),
        ];
    }

    // ─────────────────────────────────────────────────────────
    //  INVENTORY QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * Active batches that have passed their expiry date.
     */
    public function getExpiredProducts(int $limit = 15): array
    {
        return InventoryBatch::with('product:id,name,sku')
            ->where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', Carbon::today())
            ->where('available_quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->limit($limit)
            ->get()
            ->filter(fn ($b) => $b->product !== null)
            ->map(fn ($b) => [
                'product'    => $b->product->name,
                'batch'      => $b->batch_number,
                'quantity'   => $b->available_quantity,
                'expired_on' => $b->expiry_date->format('Y-m-d'),
                'days_ago'   => (int) Carbon::today()->diffInDays($b->expiry_date),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Active batches expiring within N days from now.
     */
    public function getExpiringProducts(int $days = 7, int $limit = 15): array
    {
        return InventoryBatch::with('product:id,name,sku')
            ->where('status', 'active')
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [Carbon::today(), Carbon::today()->addDays($days)])
            ->where('available_quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->limit($limit)
            ->get()
            ->filter(fn ($b) => $b->product !== null)
            ->map(fn ($b) => [
                'product'    => $b->product->name,
                'batch'      => $b->batch_number,
                'quantity'   => $b->available_quantity,
                'expires_on' => $b->expiry_date->format('Y-m-d'),
                'days_left'  => (int) Carbon::today()->diffInDays($b->expiry_date),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Total inventory valuation across all active batches.
     */
    public function getInventoryValue(): array
    {
        $value = InventoryBatch::where('status', 'active')
            ->selectRaw('
                SUM(available_quantity * purchase_price) as cost_value,
                SUM(available_quantity * selling_price)  as retail_value,
                SUM(available_quantity)                  as total_units
            ')
            ->first();

        return [
            'cost_value'   => round((float) ($value->cost_value ?? 0), 2),
            'retail_value' => round((float) ($value->retail_value ?? 0), 2),
            'total_units'  => (int) ($value->total_units ?? 0),
        ];
    }

    // ─────────────────────────────────────────────────────────
    //  EXPENSE QUERIES
    // ─────────────────────────────────────────────────────────

    /**
     * Today's expenses total and breakdown.
     */
    public function getTodayExpenses(): array
    {
        $expenses = Expense::whereDate('date', Carbon::today())
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        return [
            'total'    => round((float) $expenses->sum('total'), 2),
            'breakdown' => $expenses->map(fn ($e) => [
                'category' => $e->category,
                'amount'   => round((float) $e->total, 2),
            ])->toArray(),
        ];
    }

    /**
     * Current month's expenses total and breakdown.
     */
    public function getMonthlyExpenses(): array
    {
        $expenses = Expense::whereMonth('date', Carbon::now()->month)
            ->whereYear('date', Carbon::now()->year)
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        return [
            'total'    => round((float) $expenses->sum('total'), 2),
            'breakdown' => $expenses->map(fn ($e) => [
                'category' => $e->category,
                'amount'   => round((float) $e->total, 2),
            ])->toArray(),
        ];
    }

    /**
     * Profit = Sales Revenue – Expenses for a date range.
     */
    public function getProfitSummary(Carbon $start, Carbon $end): array
    {
        $revenue = (float) Sale::where('status', 'completed')
            ->whereBetween('created_at', [$start->startOfDay(), $end->endOfDay()])
            ->sum('total');

        $expenses = (float) Expense::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->sum('amount');

        $grossProfit = (float) SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$start->startOfDay(), $end->endOfDay()])
            ->sum('sale_items.profit');

        return [
            'revenue'       => round($revenue, 2),
            'expenses'      => round($expenses, 2),
            'gross_profit'  => round($grossProfit, 2),
            'net_profit'    => round($revenue - $expenses, 2),
        ];
    }
}
