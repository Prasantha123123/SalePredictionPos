<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected \App\Services\ExpiryService $expiryService
    ) {}

    /**
     * Main Analytics Dashboard
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $today = $now->format('Y-m-d');
        $yesterday = $now->copy()->subDay()->format('Y-m-d');
        $startOfWeek = $now->copy()->startOfWeek()->format('Y-m-d H:i:s');
        $startOfMonth = $now->copy()->startOfMonth()->format('Y-m-d H:i:s');
        $startOfYear = $now->copy()->startOfYear()->format('Y-m-d H:i:s');

        // Summary Cards Data
        $todaySales = (float) Sale::where('status', 'completed')->whereDate('created_at', $today)->sum('total');
        $yesterdaySales = (float) Sale::where('status', 'completed')->whereDate('created_at', $yesterday)->sum('total');
        $weeklySales = (float) Sale::where('status', 'completed')->where('created_at', '>=', $startOfWeek)->sum('total');
        $monthlySales = (float) Sale::where('status', 'completed')->where('created_at', '>=', $startOfMonth)->sum('total');
        $yearlySales = (float) Sale::where('status', 'completed')->where('created_at', '>=', $startOfYear)->sum('total');

        $todayOrders = Sale::where('status', 'completed')->whereDate('created_at', $today)->count();
        $totalOrders = Sale::where('status', 'completed')->count();
        $totalProductsSold = (int) SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->sum('sale_items.quantity');

        $grossRevenue = (float) Sale::where('status', 'completed')->sum('total');
        $discountGiven = (float) Sale::where('status', 'completed')->sum('discount_amount');
        $averageOrderValue = $totalOrders > 0 ? round($grossRevenue / $totalOrders, 2) : 0;

        // Total Cost & Profit Calculation
        $totalCost = (float) SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->sum(DB::raw('sale_items.quantity * COALESCE(products.cost, 0)'));
        $totalProfit = round($grossRevenue - $totalCost, 2);

        // Inventory Stock Alerts
        $lowStockProducts = Inventory::whereColumn('quantity', '<=', 'low_stock_threshold')
            ->where('quantity', '>', 0)->count();
        $outOfStockProducts = Inventory::where('quantity', '<=', 0)->count();

        // Top Selling Product & Category
        $topProductRow = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->select('products.name', DB::raw('SUM(sale_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_qty')
            ->first();
        $topSellingProduct = $topProductRow ? $topProductRow->name : 'N/A';

        $topCategoryRow = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.status', 'completed')
            ->select('categories.name', DB::raw('SUM(sale_items.total) as total_rev'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_rev')
            ->first();
        $bestSellingCategory = $topCategoryRow ? $topCategoryRow->name : 'N/A';

        // Most Used Payment Method
        $topPaymentRow = Sale::where('status', 'completed')
            ->select('payment_method', DB::raw('COUNT(*) as cnt'))
            ->groupBy('payment_method')
            ->orderByDesc('cnt')
            ->first();
        $mostUsedPaymentMethod = $topPaymentRow ? ucfirst($topPaymentRow->payment_method) : 'Cash';

        // Trend calculation
        $salesGrowthPct = $yesterdaySales > 0 ? round((($todaySales - $yesterdaySales) / $yesterdaySales) * 100, 1) : ($todaySales > 0 ? 100 : 0);

        // Chart 1: Sales Trend (30 Days Daily)
        $salesTrend = Sale::where('status', 'completed')
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => Carbon::parse($r->date)->format('M d'),
                'revenue' => round((float) $r->revenue, 2),
                'orders' => (int) $r->orders,
            ]);

        // Chart 2: Top 10 Products (Bar Chart)
        $topProducts = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.quantity) as units_sold'),
                DB::raw('SUM(sale_items.total) as revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name' => strlen($r->name) > 18 ? substr($r->name, 0, 18) . '...' : $r->name,
                'units' => (int) $r->units_sold,
                'revenue' => round((float) $r->revenue, 2),
            ]);

        // Chart 3: Category Breakdown (Pie Chart)
        $categoryBreakdown = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.status', 'completed')
            ->select(
                'categories.name',
                DB::raw('SUM(sale_items.total) as revenue')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'value' => round((float) $r->revenue, 2),
            ]);

        // Chart 4: Payment Distribution (Donut Chart)
        $paymentDistribution = Sale::where('status', 'completed')
            ->select('payment_method', DB::raw('SUM(total) as revenue'), DB::raw('COUNT(*) as count'))
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($r) => [
                'name' => ucfirst($r->payment_method),
                'value' => round((float) $r->revenue, 2),
                'count' => (int) $r->count,
            ]);

        // Revenue vs Profit (Last 7 Days)
        $revenueVsProfit = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i)->format('Y-m-d');
            $dayRev = (float) Sale::where('status', 'completed')->whereDate('created_at', $d)->sum('total');
            $dayCost = (float) SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->where('sales.status', 'completed')
                ->whereDate('sales.created_at', $d)
                ->sum(DB::raw('sale_items.quantity * COALESCE(products.cost, 0)'));
            $revenueVsProfit[] = [
                'day' => Carbon::parse($d)->format('D'),
                'revenue' => round($dayRev, 2),
                'profit' => round($dayRev - $dayCost, 2),
            ];
        }

        // Cashier Performance
        $cashierPerformance = Sale::join('users', 'sales.user_id', '=', 'users.id')
            ->where('sales.status', 'completed')
            ->select('users.name', DB::raw('COUNT(sales.id) as orders_count'), DB::raw('SUM(sales.total) as total_sales'))
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_sales')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'orders' => (int) $r->orders_count,
                'sales' => round((float) $r->total_sales, 2),
            ]);

        return Inertia::render('reports/index', [
            'summary' => [
                'todaySales' => $todaySales,
                'yesterdaySales' => $yesterdaySales,
                'weeklySales' => $weeklySales,
                'monthlySales' => $monthlySales,
                'yearlySales' => $yearlySales,
                'todayOrders' => $todayOrders,
                'totalOrders' => $totalOrders,
                'totalProductsSold' => $totalProductsSold,
                'averageOrderValue' => $averageOrderValue,
                'grossRevenue' => $grossRevenue,
                'discountGiven' => $discountGiven,
                'totalProfit' => $totalProfit,
                'lowStockProducts' => $lowStockProducts,
                'outOfStockProducts' => $outOfStockProducts,
                'topSellingProduct' => $topSellingProduct,
                'bestSellingCategory' => $bestSellingCategory,
                'mostUsedPaymentMethod' => $mostUsedPaymentMethod,
                'salesGrowthPct' => $salesGrowthPct,
            ],
            'salesTrend' => $salesTrend,
            'topProducts' => $topProducts,
            'categoryBreakdown' => $categoryBreakdown,
            'paymentDistribution' => $paymentDistribution,
            'revenueVsProfit' => $revenueVsProfit,
            'cashierPerformance' => $cashierPerformance,
        ]);
    }

    /**
     * Daily Sales Report Page
     */
    public function dailySales(Request $request): Response
    {
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));
        $cashierId = $request->input('cashier_id');
        $customerId = $request->input('customer_id');
        $paymentMethod = $request->input('payment_method');
        $invoiceNo = $request->input('invoice_number');
        $categoryId = $request->input('category_id');

        $query = Sale::with(['user:id,name', 'customer:id,name', 'items.product:id,name,cost'])
            ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);

        if ($cashierId) {
            $query->where('user_id', $cashierId);
        }
        if ($customerId) {
            $query->where('customer_id', $customerId);
        }
        if ($paymentMethod) {
            $query->where('payment_method', $paymentMethod);
        }
        if ($invoiceNo) {
            $query->where('invoice_number', 'like', "%{$invoiceNo}%");
        }
        if ($categoryId) {
            $query->whereHas('items.product', function ($q) use ($categoryId) {
                $q->where('category_id', $categoryId);
            });
        }

        $sales = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        // Bottom Summary Statistics
        $allMatchingSales = (clone $query)->get();
        $totalOrdersCount = $allMatchingSales->count();
        $grossSalesSum = (float) $allMatchingSales->sum('total');
        $discountSum = (float) $allMatchingSales->sum('discount_amount');
        $taxSum = (float) $allMatchingSales->sum('tax_amount');
        $subtotalSum = (float) $allMatchingSales->sum('subtotal');

        $totalQtySold = 0;
        $totalCostSum = 0;
        foreach ($allMatchingSales as $s) {
            foreach ($s->items as $item) {
                $totalQtySold += $item->quantity;
                $cost = $item->product ? (float) $item->product->cost : 0;
                $totalCostSum += ($item->quantity * $cost);
            }
        }
        $netProfitSum = round($grossSalesSum - $totalCostSum, 2);

        return Inertia::render('reports/daily-sales', [
            'sales' => $sales,
            'cashiers' => User::select('id', 'name')->get(),
            'customers' => Customer::select('id', 'name')->get(),
            'categories' => Category::select('id', 'name')->get(),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'cashier_id' => $cashierId,
                'customer_id' => $customerId,
                'payment_method' => $paymentMethod,
                'invoice_number' => $invoiceNo,
                'category_id' => $categoryId,
            ],
            'totals' => [
                'totalOrders' => $totalOrdersCount,
                'totalQuantity' => $totalQtySold,
                'grossSales' => round($grossSalesSum, 2),
                'discount' => round($discountSum, 2),
                'tax' => round($taxSum, 2),
                'netSales' => round($subtotalSum, 2),
                'profit' => $netProfitSum,
            ],
        ]);
    }

    /**
     * Invoice Detail Viewer
     */
    public function showInvoice(Sale $sale): JsonResponse
    {
        $sale->load(['user', 'customer', 'items.product']);
        return response()->json($sale);
    }

    /**
     * Product Sales Report Page
     */
    public function productSales(Request $request): Response
    {
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));
        $productId = $request->input('product_id');
        $categoryId = $request->input('category_id');
        $barcode = $request->input('barcode');
        $sortBy = $request->input('sort_by', 'highest_sales');

        $query = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('inventory', 'products.id', '=', 'inventory.product_id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);

        if ($productId) {
            $query->where('products.id', $productId);
        }
        if ($categoryId) {
            $query->where('products.category_id', $categoryId);
        }
        if ($barcode) {
            $query->where('products.barcode', 'like', "%{$barcode}%");
        }

        $query->select(
            'products.id',
            'products.name',
            'products.sku',
            'products.barcode',
            'products.cost',
            'products.price',
            'categories.name as category_name',
            DB::raw('COALESCE(inventory.quantity, 0) as remaining_stock'),
            DB::raw('SUM(sale_items.quantity) as units_sold'),
            DB::raw('SUM(sale_items.total) as total_revenue'),
            DB::raw('SUM(sale_items.discount) as total_discount'),
            DB::raw('SUM(sale_items.quantity * COALESCE(products.cost, 0)) as total_cost')
        )->groupBy(
            'products.id',
            'products.name',
            'products.sku',
            'products.barcode',
            'products.cost',
            'products.price',
            'categories.name',
            'inventory.quantity'
        );

        switch ($sortBy) {
            case 'lowest_sales':
                $query->orderBy('total_revenue');
                break;
            case 'most_profit':
                $query->orderByDesc(DB::raw('SUM(sale_items.total) - SUM(sale_items.quantity * COALESCE(products.cost, 0))'));
                break;
            case 'most_quantity':
                $query->orderByDesc('units_sold');
                break;
            default:
                $query->orderByDesc('total_revenue');
                break;
        }

        $productSales = $query->paginate(20)->withQueryString();

        $productSales->getCollection()->transform(function ($p) {
            $units = (int) $p->units_sold;
            $rev = (float) $p->total_revenue;
            $cost = (float) $p->total_cost;
            $p->avg_price = $units > 0 ? round($rev / $units, 2) : (float) $p->price;
            $p->profit = round($rev - $cost, 2);
            $p->stock_value = round((float) $p->remaining_stock * (float) $p->cost, 2);
            return $p;
        });

        return Inertia::render('reports/product-sales', [
            'productSales' => $productSales,
            'productsList' => Product::select('id', 'name', 'sku', 'barcode')->get(),
            'categoriesList' => Category::select('id', 'name')->get(),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'product_id' => $productId,
                'category_id' => $categoryId,
                'barcode' => $barcode,
                'sort_by' => $sortBy,
            ],
        ]);
    }

    /**
     * Category Sales Report Page
     */
    public function categorySales(Request $request): Response
    {
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));

        $categories = Category::withCount('products')
            ->get()
            ->map(function ($cat) use ($startDate, $endDate) {
                $salesData = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->where('products.category_id', $cat->id)
                    ->where('sales.status', 'completed')
                    ->whereBetween('sales.created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])
                    ->select(
                        DB::raw('SUM(sale_items.quantity) as qty'),
                        DB::raw('SUM(sale_items.total) as rev'),
                        DB::raw('SUM(sale_items.quantity * COALESCE(products.cost, 0)) as cost')
                    )->first();

                $qty = $salesData ? (int) $salesData->qty : 0;
                $rev = $salesData ? (float) $salesData->rev : 0;
                $cost = $salesData ? (float) $salesData->cost : 0;

                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'products_count' => $cat->products_count,
                    'quantity_sold' => $qty,
                    'revenue' => round($rev, 2),
                    'profit' => round($rev - $cost, 2),
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        return Inertia::render('reports/category-sales', [
            'categories' => $categories,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Customer Report Page
     */
    public function customerSales(Request $request): Response
    {
        $topCustomers = Customer::withCount(['sales as orders_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->withSum(['sales as total_spent' => function ($q) {
                $q->where('status', 'completed');
            }], 'total')
            ->orderByDesc('total_spent')
            ->limit(20)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'loyalty_points' => $c->loyalty_points,
                'orders_count' => (int) $c->orders_count,
                'total_spent' => round((float) ($c->total_spent ?? 0), 2),
                'avg_order' => $c->orders_count > 0 ? round(($c->total_spent ?? 0) / $c->orders_count, 2) : 0,
            ]);

        return Inertia::render('reports/customer-sales', [
            'topCustomers' => $topCustomers,
        ]);
    }

    /**
     * Payment Report Page
     */
    public function paymentSales(Request $request): Response
    {
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));

        $methods = ['cash', 'card', 'bank_transfer', 'mobile_payment', 'other'];

        $grandTotalRevenue = (float) Sale::where('status', 'completed')
            ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])
            ->sum('total');

        $paymentReport = collect($methods)->map(function ($method) use ($startDate, $endDate, $grandTotalRevenue) {
            $data = Sale::where('status', 'completed')
                ->where('payment_method', $method)
                ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])
                ->select(DB::raw('COUNT(*) as tx_count'), DB::raw('SUM(total) as rev'))
                ->first();

            $txCount = $data ? (int) $data->tx_count : 0;
            $rev = $data ? (float) $data->rev : 0;
            $pct = $grandTotalRevenue > 0 ? round(($rev / $grandTotalRevenue) * 100, 1) : 0;

            return [
                'method' => ucfirst(str_replace('_', ' ', $method)),
                'key' => $method,
                'transactions' => $txCount,
                'revenue' => round($rev, 2),
                'percentage' => $pct,
            ];
        });

        return Inertia::render('reports/payment-sales', [
            'paymentReport' => $paymentReport,
            'grandTotal' => round($grandTotalRevenue, 2),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Inventory Report Page
     */
    public function inventorySales(Request $request): Response
    {
        $products = Product::with(['category', 'inventory'])->get();

        $currentStockCount = $products->sum(fn ($p) => $p->inventory->quantity ?? 0);
        $lowStockCount = $products->filter(fn ($p) => ($p->inventory->quantity ?? 0) <= ($p->inventory->low_stock_threshold ?? 5) && ($p->inventory->quantity ?? 0) > 0)->count();
        $outOfStockCount = $products->filter(fn ($p) => ($p->inventory->quantity ?? 0) <= 0)->count();

        // Calculate cost and retail valuation directly from active batches
        $activeBatches = InventoryBatch::where('status', 'active')->get();
        $stockCostValue = $activeBatches->sum(fn ($b) => $b->available_quantity * (float) $b->purchase_price);
        $stockRetailValue = $activeBatches->sum(fn ($b) => $b->available_quantity * (float) $b->selling_price);

        $inventoryList = $products->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'sku' => $p->sku,
            'barcode' => $p->barcode,
            'category' => $p->category->name ?? 'Uncategorized',
            'stock' => $p->inventory->quantity ?? 0,
            'low_stock_threshold' => $p->inventory->low_stock_threshold ?? 5,
            'cost' => (float) $p->cost,
            'price' => (float) $p->price,
            'total_cost_value' => round(($p->inventory->quantity ?? 0) * (float) $p->cost, 2),
            'total_retail_value' => round(($p->inventory->quantity ?? 0) * (float) $p->price, 2),
            'status' => ($p->inventory->quantity ?? 0) <= 0 ? 'Out of Stock' : (($p->inventory->quantity ?? 0) <= ($p->inventory->low_stock_threshold ?? 5) ? 'Low Stock' : 'In Stock'),
        ]);

        return Inertia::render('reports/inventory-sales', [
            'inventoryList' => $inventoryList,
            'summary' => [
                'currentStock' => $currentStockCount,
                'lowStock' => $lowStockCount,
                'outOfStock' => $outOfStockCount,
                'stockCostValue' => round($stockCostValue, 2),
                'stockRetailValue' => round($stockRetailValue, 2),
            ],
        ]);
    }

    /**
     * Profit Report Page
     */
    public function profitSales(Request $request): Response
    {
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));

        $sales = Sale::where('status', 'completed')
            ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])
            ->get();

        $grossRevenue = (float) $sales->sum('total');

        // Calculate COGS directly from the purchase prices recorded in sale items
        $cogs = (float) SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()])
            ->sum(DB::raw('sale_items.quantity * COALESCE(sale_items.purchase_price, 0)'));

        $operatingExpenses = (float) Expense::whereBetween('date', [$startDate, $endDate])->sum('amount');

        $grossProfit = round($grossRevenue - $cogs, 2);
        $netProfit = round($grossProfit - $operatingExpenses, 2);
        $marginPct = $grossRevenue > 0 ? round(($netProfit / $grossRevenue) * 100, 1) : 0;

        return Inertia::render('reports/profit-sales', [
            'summary' => [
                'grossRevenue' => round($grossRevenue, 2),
                'cogs' => round($cogs, 2),
                'grossProfit' => $grossProfit,
                'operatingExpenses' => round($operatingExpenses, 2),
                'netProfit' => $netProfit,
                'marginPct' => $marginPct,
            ],
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Expiry and Waste Auditing Report
     */
    public function expiryReport(Request $request): Response
    {
        $filter = $request->input('filter', 'all');
        $batches = $this->expiryService->getExpiringBatchesReport($filter === 'all' ? null : $filter);

        $expiredLoss = 0.0;
        $totalWastedItems = 0;
        $activeBatchesCount = 0;

        foreach ($batches as $b) {
            if ($b['status'] === 'expired') {
                $expiredLoss += $b['cost_price'] * $b['quantity'];
                $totalWastedItems += $b['quantity'];
            } else {
                $activeBatchesCount++;
            }
        }

        return Inertia::render('reports/expiry-report', [
            'batches' => $batches,
            'summary' => [
                'expiredLoss' => round($expiredLoss, 2),
                'totalWastedItems' => $totalWastedItems,
                'activeBatchesCount' => $activeBatchesCount,
                'totalAlertsCount' => count($batches),
            ],
            'filters' => [
                'filter' => $filter,
            ],
        ]);
    }
}
