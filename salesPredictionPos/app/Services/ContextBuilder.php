<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalesPrediction;
use Illuminate\Support\Carbon;

class ContextBuilder
{
    /**
     * Build system context based on role permissions.
     */
    public function build(string $role): string
    {
        $context = "";

        // All users get product counts and catalog help
        $context .= "TOTAL ACTIVE SKUs: " . Product::where('is_active', true)->count() . "\n";

        // Cashiers get limited POS checkout contexts
        if ($role === 'Cashier') {
            $context .= "TODAY'S TRANSACTIONS COUNT: " . Sale::whereDate('created_at', Carbon::today())->count() . "\n";
            $context .= "Your access is restricted strictly to sales checkouts, cashiering procedures, and customer lookups. You cannot view expenses, profits, predicted statistics, or user settings.\n";
            return $context;
        }

        // Inventory Staff get stock and expiry contexts
        if ($role === 'Inventory Staff') {
            $context .= "LOW STOCK COUNT: " . Inventory::whereColumn('quantity', '<=', 'low_stock_threshold')->count() . "\n";
            $expired = InventoryBatch::where('status', 'active')->where('expiry_date', '<', Carbon::today())->sum('quantity');
            $context .= "EXPIRED ITEMS IN STOCK: " . (int)$expired . "\n";
            $context .= "Your access is focused on inventory status, shelf-life batches, and FEFO stock levels. You cannot view store profits, pricing cost fields, or cashier summaries.\n";
            return $context;
        }

        // Managers and Admins get full financial and prediction access
        $todaySales = Sale::whereDate('created_at', Carbon::today())->where('status', 'completed')->sum('total');
        $lowStock = Inventory::whereColumn('quantity', '<=', 'low_stock_threshold')->count();
        $expired = InventoryBatch::where('status', 'active')->where('expiry_date', '<', Carbon::today())->sum('quantity');
        $customerCount = Customer::count();

        $tomorrowPrediction = SalesPrediction::where('prediction_date', Carbon::tomorrow())->latest()->first();
        $predAmt = $tomorrowPrediction ? (float)$tomorrowPrediction->predicted_amount : null;
        $predConf = $tomorrowPrediction ? (float)$tomorrowPrediction->confidence : null;
        $predModel = $tomorrowPrediction ? $tomorrowPrediction->model_used : 'N/A';

        $context .= "TODAY'S COMPLETED REVENUE: Rs. " . number_format($todaySales, 2) . "\n";
        $context .= "LOW STOCK ALERTS COUNT: {$lowStock}\n";
        $context .= "EXPIRED UNITS COUNT: " . (int)$expired . "\n";
        $context .= "TOTAL CRM CUSTOMERS: {$customerCount}\n";
        
        if ($predAmt) {
            $context .= "TOMORROW AI FORECAST: Rs. " . number_format($predAmt, 2) . " (Confidence: {$predConf}%, Model: {$predModel})\n";
        }

        if ($role === 'Admin') {
            $totalExpenses = Expense::whereMonth('date', Carbon::today()->month)->sum('amount');
            $context .= "CURRENT MONTH EXPENSES: Rs. " . number_format($totalExpenses, 2) . "\n";
            $context .= "You have absolute root administrative authorization. You can explain passwords resets, roles creation, and system configurations.\n";
        } else {
            $context .= "You have manager authorization. You can review inventory, forecasts, and sales, but cannot view or edit user accounts.\n";
        }

        return $context;
    }
}
