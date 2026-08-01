<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * AI Assistant orchestration layer.
 *
 * Responsibilities:
 *  1. Detect user intent via keyword/pattern matching (no LLM call needed)
 *  2. Dispatch to DatabaseQueryService for the matched intent
 *  3. Format query results into structured text for the LLM system prompt
 */
class AIAssistantService
{
    public function __construct(
        protected DatabaseQueryService $dbQuery
    ) {}

    // ─────────────────────────────────────────────────────────
    //  INTENT DETECTION
    // ─────────────────────────────────────────────────────────

    /**
     * Map of intent identifiers to arrays of trigger keywords/phrases.
     * Order matters: more specific patterns should come first.
     *
     * @return array<string, string[]>
     */
    protected function intentPatterns(): array
    {
        return [
            // ── Sales (specific periods first — order matters!) ──
            'sales_yesterday'       => ['yesterday sale', 'yesterday\'s sale', 'yesterday revenue', 'yesterday income', 'yesterday earn', 'sales yesterday', 'sale yesterday', 'yesterday order', 'yesterday transaction'],
            'sales_last_week'       => ['last week sale', 'last week\'s sale', 'last week revenue', 'last week income', 'last week earn', 'sales last week', 'last week order', 'last week transaction'],
            'sales_weekly'          => ['this week sale', 'weekly sale', 'week sale', 'this week revenue', 'week revenue', 'sales this week', 'weekly revenue', 'week order', 'weekly order', 'this week order'],
            'sales_yearly'          => ['this year sale', 'yearly sale', 'year sale', 'annual sale', 'this year revenue', 'yearly revenue', 'annual revenue', 'sales this year', 'year order', 'this year order'],
            'sales_last_month'      => ['last month sale', 'last month\'s sale', 'last month revenue', 'last month income', 'last month earn', 'sales last month', 'last month order', 'last month transaction'],
            'sales_monthly'         => ['this month sale', 'monthly sale', 'month sale', 'month revenue', 'monthly revenue', 'sales this month', 'month order', 'monthly order', 'this month order', 'this month revenue'],
            'sales_today'           => ['today sale', 'today\'s sale', 'today revenue', 'today income', 'today earn', 'how much did i earn today', 'how much i earn', 'today\'s revenue', 'today\'s income', 'sales today', 'daily sale', 'revenue today', 'income today', 'earning today', 'today order', 'today transaction', 'how many sale today', 'how much sale today', 'today\'s order'],

            // ── Analytics ──
            'top_products'          => ['top sell', 'best sell', 'most sell', 'most sold', 'top product', 'best product', 'popular product', 'highest sell', 'top selling', 'best selling', 'most selling', 'most popular', 'highest selling', 'fast moving', 'fast sell', 'fastest selling', 'fast product'],
            'worst_products'        => ['worst sell', 'least sell', 'least sold', 'worst product', 'least popular', 'slow moving', 'slow sell', 'worst selling', 'least selling', 'not selling'],
            'profitable_products'   => ['most profitable', 'highest profit', 'best profit', 'profitable product', 'profit product', 'most profit', 'maximum profit'],
            'revenue_by_category'   => ['revenue by category', 'category revenue', 'category earn', 'category sale', 'which category earn', 'category wise', 'category performance', 'earning by category', 'sales by category'],
            'revenue_by_payment'    => ['payment method', 'revenue by payment', 'cash vs card', 'digital payment', 'payment breakdown', 'how people pay', 'payment wise', 'cash card'],
            'peak_hour'             => ['peak hour', 'busiest hour', 'busy hour', 'rush hour', 'most sale hour', 'what time', 'peak time', 'busiest time'],
            'peak_day'              => ['peak day', 'busiest day', 'busy day', 'most sale day', 'which day', 'best day'],
            'monthly_chart'         => ['monthly chart', 'show monthly sale', 'sales chart', 'month chart', 'monthly graph', 'sales graph', 'monthly trend'],

            // ── Inventory (broad single-word triggers placed AFTER multi-word specifics) ──
            'low_stock'             => ['low stock', 'low inventory', 'restock', 'running low', 'need to order', 'stock low', 'reorder', 'stock alert', 'stock warning', 'less stock', 'shortage'],
            'out_of_stock'          => ['out of stock', 'no stock', 'finished stock', 'zero stock', 'unavailable product', 'stock out', 'stock finished', 'not available'],
            'expired'               => ['expired product', 'expired item', 'expired stock', 'show expired', 'past expiry', 'overdue expiry', 'expiry product', 'expiry item', 'expiry stock', 'expired', 'expiry date', 'already expired', 'product expired', 'item expired', 'which product expir', 'tell me expir', 'list expir', 'show expir', 'any expir', 'expiry list', 'expiry name'],
            'expiring_soon'         => ['expiring soon', 'expire soon', 'about to expire', 'near expiry', 'expiry warning', 'expire this week', 'expiring', 'going to expire', 'will expire', 'close to expir', 'expire within'],
            'inventory_value'       => ['inventory value', 'stock value', 'total inventory', 'inventory worth', 'stock worth', 'inventory valuation', 'total stock value'],

            // ── Products ──
            'products_summary'      => ['how many product', 'total product', 'product count', 'number of product', 'all product', 'products available', 'product list', 'what product do i have', 'what products', 'how many item', 'total item', 'list all product', 'show all product', 'available product'],
            'product_details'       => ['product detail', 'tell me about product', 'product info', 'show product', 'find product', 'search product', 'price of', 'product price'],

            // ── Customers ──
            'customers_summary'         => ['how many customer', 'total customer', 'customer count', 'number of customer', 'all customer', 'customer list'],
            'frequent_customer'         => ['frequent customer', 'loyal customer', 'best customer', 'top customer', 'most purchase', 'most order customer', 'vip customer', 'regular customer'],
            'customer_purchase_history' => ['purchase history', 'buying history', 'order history', 'history of customer', 'what did customer buy', 'sales for customer', 'history of', 'purchased history', 'bought history'],

            // ── Expenses ──
            'expenses_today'        => ['today expense', 'today\'s expense', 'expense today', 'today cost'],
            'expenses_monthly'      => ['monthly expense', 'this month expense', 'month expense', 'expense this month'],
            'profit'                => ['today profit', 'today\'s profit', 'profit today', 'net profit', 'how much profit', 'earnings', 'profit summary', 'gross profit', 'profit this month', 'monthly profit', 'total profit'],
        ];
    }

    /**
     * Classify a user message into an intent category.
     *
     * @return array{intent: string, subject: string|null}
     */
    public function detectIntent(string $message): array
    {
        $msg = strtolower(trim($message));

        foreach ($this->intentPatterns() as $intent => $patterns) {
            foreach ($patterns as $pattern) {
                if (str_contains($msg, $pattern)) {
                    // Extract subject depending on the intent type
                    $subject = null;
                    if ($intent === 'product_details') {
                        $subject = $this->extractProductName($msg);
                    } elseif ($intent === 'customer_purchase_history') {
                        $subject = $this->extractCustomerName($msg);
                    }

                    return ['intent' => $intent, 'subject' => $subject];
                }
            }
        }

        return ['intent' => 'general', 'subject' => null];
    }

    // ─────────────────────────────────────────────────────────
    //  QUERY DISPATCH
    // ─────────────────────────────────────────────────────────

    /**
     * Execute the appropriate database query for the detected intent.
     *
     * @return array|null  Null if the intent is 'general' (no DB query needed).
     */
    public function queryDatabase(string $intent, ?string $subject = null): ?array
    {
        try {
            return match ($intent) {
                // Products
                'products_summary'    => $this->dbQuery->getProductsSummary(),
                'product_details'     => $subject ? $this->dbQuery->getProductDetails($subject) : $this->dbQuery->getProductsSummary(),

                // Sales
                'sales_today'               => $this->dbQuery->getTodaySales(),
                'sales_yesterday'           => $this->dbQuery->getYesterdaySales(),
                'sales_weekly'              => $this->dbQuery->getWeeklySales(),
                'sales_last_week'           => $this->dbQuery->getLastWeekSales(),
                'sales_monthly'             => $this->dbQuery->getMonthlySales(),
                'sales_last_month'          => $this->dbQuery->getLastMonthSales(),
                'sales_yearly'              => $this->dbQuery->getYearlySales(),

                // Analytics
                'top_products'        => $this->dbQuery->getTopSellingProducts(),
                'worst_products'      => $this->dbQuery->getWorstSellingProducts(),
                'profitable_products' => $this->dbQuery->getMostProfitableProducts(),
                'revenue_by_category' => $this->dbQuery->getRevenueByCategory(),
                'revenue_by_payment'  => $this->dbQuery->getRevenueByPaymentMethod(now()->startOfMonth(), now()),
                'peak_hour'           => $this->dbQuery->getPeakSalesHour(),
                'peak_day'            => $this->dbQuery->getPeakSalesDay(),
                'monthly_chart'       => $this->dbQuery->getMonthlySalesChart(),

                // Inventory
                'low_stock'           => $this->dbQuery->getLowStockProducts(),
                'out_of_stock'        => $this->dbQuery->getOutOfStockProducts(),
                'expired'             => $this->dbQuery->getExpiredProducts(),
                'expiring_soon'       => $this->dbQuery->getExpiringProducts(),
                'inventory_value'     => $this->dbQuery->getInventoryValue(),

                // Customers
                'customers_summary'         => $this->dbQuery->getCustomersSummary(),
                'frequent_customer'         => $this->dbQuery->getMostFrequentCustomer(),
                'customer_purchase_history' => $subject ? $this->dbQuery->getCustomerPurchaseHistory($subject) : $this->dbQuery->getCustomersSummary(),

                // Expenses
                'expenses_today'      => $this->dbQuery->getTodayExpenses(),
                'expenses_monthly'    => $this->dbQuery->getMonthlyExpenses(),
                'profit'              => $this->dbQuery->getProfitSummary(now()->startOfMonth(), now()),

                default               => null,
            };
        } catch (\Exception $e) {
            Log::error("AIAssistantService query error for intent [{$intent}]: " . $e->getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────
    //  DATA FORMATTING
    // ─────────────────────────────────────────────────────────

    /**
     * Convert raw query results into a structured text block for the LLM prompt.
     */
    public function formatDataContext(string $intent, array $data): string
    {
        if (empty($data)) {
            return $this->noDataMessage($intent);
        }

        return match ($intent) {
            'products_summary'    => $this->formatProductsSummary($data),
            'product_details'     => $this->formatProductDetails($data),

            'sales_today'               => $this->formatSalesSummary('Today', $data),
            'sales_yesterday'           => $this->formatSalesSummary('Yesterday', $data),
            'sales_weekly'              => $this->formatSalesSummary('This Week', $data),
            'sales_last_week'           => $this->formatSalesSummary('Last Week', $data),
            'sales_monthly'             => $this->formatSalesSummary('This Month', $data),
            'sales_last_month'          => $this->formatSalesSummary('Last Month', $data),
            'sales_yearly'              => $this->formatSalesSummary('This Year', $data),

            'top_products'        => $this->formatProductRanking('Top Selling Products (Last 30 Days)', $data),
            'worst_products'      => $this->formatProductRanking('Worst Selling Products (Last 30 Days)', $data),
            'profitable_products' => $this->formatProfitableProducts($data),
            'revenue_by_category' => $this->formatCategoryRevenue($data),
            'revenue_by_payment'  => $this->formatPaymentRevenue($data),
            'peak_hour'           => $this->formatPeakHour($data),
            'peak_day'            => $this->formatPeakDay($data),
            'monthly_chart'       => $this->formatMonthlyChart($data),

            'low_stock'           => $this->formatLowStock($data),
            'out_of_stock'        => $this->formatOutOfStock($data),
            'expired'             => $this->formatExpired($data),
            'expiring_soon'       => $this->formatExpiringSoon($data),
            'inventory_value'     => $this->formatInventoryValue($data),

            'customers_summary'         => $this->formatCustomersSummary($data),
            'frequent_customer'         => $this->formatFrequentCustomer($data),
            'customer_purchase_history' => $this->formatCustomerPurchaseHistory($data),

            'expenses_today'      => $this->formatExpenses('Today', $data),
            'expenses_monthly'    => $this->formatExpenses('This Month', $data),
            'profit'              => $this->formatProfit($data),

            default               => json_encode($data, JSON_PRETTY_PRINT),
        };
    }

    // ─── Formatting helpers ─────────────────────────────────

    protected function noDataMessage(string $intent): string
    {
        return match ($intent) {
            'sales_today'       => 'DATABASE RESULT: No completed sales found for today.',
            'sales_yesterday'   => 'DATABASE RESULT: No completed sales found for yesterday.',
            'sales_weekly'      => 'DATABASE RESULT: No completed sales found this week.',
            'sales_monthly'     => 'DATABASE RESULT: No completed sales found this month.',
            'sales_yearly'      => 'DATABASE RESULT: No completed sales found this year.',
            'low_stock'         => 'DATABASE RESULT: No low-stock products found. All items are well stocked.',
            'out_of_stock'      => 'DATABASE RESULT: No out-of-stock products found.',
            'expired'           => 'DATABASE RESULT: No expired products found in the inventory.',
            'expiring_soon'     => 'DATABASE RESULT: No products expiring within the next 7 days.',
            'top_products'      => 'DATABASE RESULT: No sales data available for top products.',
            'product_details'   => 'DATABASE RESULT: No product matching that name was found.',
            'customer_purchase_history' => 'DATABASE RESULT: No customer matching that name was found, or they have no purchase history.',
            default             => 'DATABASE RESULT: No data found for this query.',
        };
    }

    protected function formatProductsSummary(array $data): string
    {
        return "DATABASE RESULT — Product Summary:\n"
            . "• Total Active Products: {$data['total_products']}\n"
            . "• Total Active Categories: {$data['total_categories']}\n"
            . "• Inactive Products: {$data['inactive_products']}";
    }

    protected function formatProductDetails(array $data): string
    {
        if (empty($data)) {
            return $this->noDataMessage('product_details');
        }

        $lines = "DATABASE RESULT — Product Details:\n";
        foreach ($data as $p) {
            $lines .= "• {$p['name']} (SKU: {$p['sku']}) — Price: Rs. " . number_format($p['price'], 2)
                . ", Cost: Rs. " . number_format($p['cost'], 2)
                . ", Stock: {$p['stock']}, Category: {$p['category']}\n";
        }
        return trim($lines);
    }

    protected function formatSalesSummary(string $period, array $data): string
    {
        return "DATABASE RESULT — {$period}'s Sales Summary:\n"
            . "• Total Revenue: Rs. " . number_format($data['revenue'], 2) . "\n"
            . "• Orders: {$data['order_count']}\n"
            . "• Average Order Value: Rs. " . number_format($data['avg_order'], 2) . "\n"
            . "• Total Discounts Given: Rs. " . number_format($data['total_discounts'], 2) . "\n"
            . "• Top Product: {$data['top_product']}";
    }

    protected function formatProductRanking(string $title, array $data): string
    {
        $lines = "DATABASE RESULT — {$title}:\n";
        foreach ($data as $i => $p) {
            $rank = $i + 1;
            $lines .= "  {$rank}. {$p['name']} — {$p['quantity']} units sold, Rs. " . number_format($p['revenue'], 2) . " revenue\n";
        }
        return trim($lines);
    }

    protected function formatProfitableProducts(array $data): string
    {
        $lines = "DATABASE RESULT — Most Profitable Products (Last 30 Days):\n";
        foreach ($data as $i => $p) {
            $rank = $i + 1;
            $lines .= "  {$rank}. {$p['name']} — Profit: Rs. " . number_format($p['profit'], 2)
                . ", Revenue: Rs. " . number_format($p['revenue'], 2)
                . ", Qty: {$p['quantity']}\n";
        }
        return trim($lines);
    }

    protected function formatCategoryRevenue(array $data): string
    {
        $lines = "DATABASE RESULT — Revenue by Category (Last 30 Days):\n";
        foreach ($data as $c) {
            $lines .= "• {$c['category']}: Rs. " . number_format($c['revenue'], 2)
                . " ({$c['quantity']} units, Profit: Rs. " . number_format($c['profit'], 2) . ")\n";
        }
        return trim($lines);
    }

    protected function formatPaymentRevenue(array $data): string
    {
        $lines = "DATABASE RESULT — Revenue by Payment Method (This Month):\n";
        foreach ($data as $p) {
            $lines .= "• {$p['method']}: Rs. " . number_format($p['revenue'], 2) . " ({$p['orders']} orders)\n";
        }
        return trim($lines);
    }

    protected function formatPeakHour(array $data): string
    {
        $lines = "DATABASE RESULT — Peak Sales Hours (Last 30 Days):\n";
        foreach ($data as $i => $h) {
            $rank = $i + 1;
            $lines .= "  {$rank}. {$h['hour']} — {$h['order_count']} orders, Rs. " . number_format($h['revenue'], 2) . "\n";
        }
        return trim($lines);
    }

    protected function formatPeakDay(array $data): string
    {
        $lines = "DATABASE RESULT — Sales by Day of Week (Last 30 Days):\n";
        foreach ($data as $d) {
            $lines .= "• {$d['day']}: {$d['order_count']} orders, Rs. " . number_format($d['revenue'], 2) . "\n";
        }
        return trim($lines);
    }

    protected function formatMonthlyChart(array $data): string
    {
        $lines = "DATABASE RESULT — Monthly Sales (Last 12 Months):\n";
        $lines .= "Chart Type: {$data['type']}\n";
        foreach ($data['labels'] as $i => $label) {
            $value = $data['values'][$i] ?? 0;
            $lines .= "• {$label}: Rs. " . number_format($value, 2) . "\n";
        }
        return trim($lines);
    }

    protected function formatLowStock(array $data): string
    {
        $lines = "DATABASE RESULT — Low Stock Products:\n";
        foreach ($data as $p) {
            $lines .= "• {$p['name']} (SKU: {$p['sku']}) — {$p['stock']} left (threshold: {$p['threshold']})\n";
        }
        return trim($lines);
    }

    protected function formatOutOfStock(array $data): string
    {
        $lines = "DATABASE RESULT — Out of Stock Products:\n";
        foreach ($data as $p) {
            $lines .= "• {$p['name']} (SKU: {$p['sku']}) — 0 stock\n";
        }
        return trim($lines);
    }

    protected function formatExpired(array $data): string
    {
        $lines = "DATABASE RESULT — Expired Products in Inventory:\n";
        foreach ($data as $p) {
            $lines .= "• {$p['product']} (Batch: {$p['batch']}) — {$p['quantity']} units, expired on {$p['expired_on']} ({$p['days_ago']} days ago)\n";
        }
        return trim($lines);
    }

    protected function formatExpiringSoon(array $data): string
    {
        $lines = "DATABASE RESULT — Products Expiring Within 7 Days:\n";
        foreach ($data as $p) {
            $lines .= "• {$p['product']} (Batch: {$p['batch']}) — {$p['quantity']} units, expires on {$p['expires_on']} ({$p['days_left']} days left)\n";
        }
        return trim($lines);
    }

    protected function formatInventoryValue(array $data): string
    {
        return "DATABASE RESULT — Inventory Valuation:\n"
            . "• Total Units in Stock: " . number_format($data['total_units']) . "\n"
            . "• Cost Value: Rs. " . number_format($data['cost_value'], 2) . "\n"
            . "• Retail Value: Rs. " . number_format($data['retail_value'], 2) . "\n"
            . "• Potential Margin: Rs. " . number_format($data['retail_value'] - $data['cost_value'], 2);
    }

    protected function formatCustomersSummary(array $data): string
    {
        return "DATABASE RESULT — Customer Summary:\n"
            . "• Total Customers: {$data['total_customers']}\n"
            . "• Top Customer: {$data['top_customer_name']} ({$data['top_customer_sales']} purchases)";
    }

    protected function formatFrequentCustomer(array $data): string
    {
        $lines = "DATABASE RESULT — Most Frequent Customers:\n";
        foreach ($data as $i => $c) {
            $rank = $i + 1;
            $lines .= "  {$rank}. {$c['name']} (Phone: {$c['phone']}) — {$c['total_orders']} orders, Rs. " . number_format($c['total_spent'], 2) . " total spent\n";
        }
        return trim($lines);
    }

    protected function formatExpenses(string $period, array $data): string
    {
        $lines = "DATABASE RESULT — {$period}'s Expenses:\n"
            . "• Total: Rs. " . number_format($data['total'], 2) . "\n";
        if (! empty($data['breakdown'])) {
            $lines .= "Breakdown:\n";
            foreach ($data['breakdown'] as $b) {
                $lines .= "  • {$b['category']}: Rs. " . number_format($b['amount'], 2) . "\n";
            }
        }
        return trim($lines);
    }

    protected function formatProfit(string $period = 'This Month', array $data): string
    {
        return "DATABASE RESULT — Profit Summary ({$period}):\n"
            . "• Total Revenue: Rs. " . number_format($data['revenue'], 2) . "\n"
            . "• Total Expenses: Rs. " . number_format($data['expenses'], 2) . "\n"
            . "• Gross Profit (from sales margin): Rs. " . number_format($data['gross_profit'], 2) . "\n"
            . "• Net Profit (Revenue - Expenses): Rs. " . number_format($data['net_profit'], 2);
    }

    // ─── Utility ────────────────────────────────────────────

    /**
     * Attempt to extract a product name from the user message.
     */
    protected function extractProductName(string $message): ?string
    {
        // Remove common filler words
        $cleaned = preg_replace(
            '/\b(tell me about|show me|find|search|product detail|product info|details of|info on|info about|about|the|a|an|price of|what is)\b/i',
            '',
            $message
        );

        $cleaned = trim(preg_replace('/\s+/', ' ', $cleaned));

        return strlen($cleaned) >= 2 ? $cleaned : null;
    }

    /**
     * Attempt to extract a customer name from the user message.
     */
    protected function extractCustomerName(string $message): ?string
    {
        // Remove common patterns around purchase history
        $cleaned = preg_replace(
            '/\b(purchase history|buying history|order history|history of customer|history of|what did|buy|sales for customer|sales for|find|search|show)\b/i',
            '',
            $message
        );

        $cleaned = trim(preg_replace('/\s+/', ' ', $cleaned));

        return strlen($cleaned) >= 2 ? $cleaned : null;
    }

    protected function formatCustomerPurchaseHistory(array $data): string
    {
        if (empty($data) || empty($data['purchases'])) {
            return $this->noDataMessage('customer_purchase_history');
        }

        $cust = $data['customer'];
        $lines = "DATABASE RESULT — Purchase History for Customer: {$cust['name']}\n"
            . "• Phone: " . ($cust['phone'] ?? 'N/A') . "\n"
            . "• Email: " . ($cust['email'] ?? 'N/A') . "\n"
            . "Recent Invoices:\n";

        foreach ($data['purchases'] as $p) {
            $lines .= "  • Invoice: {$p['invoice_number']} — Total: Rs. " . number_format($p['total'], 2)
                . " on {$p['date']} (Paid via {$p['payment_method']})\n";
        }

        return trim($lines);
    }
}
