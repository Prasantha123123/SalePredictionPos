<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ForecastController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AIController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('dashboard', DashboardController::class)
        ->middleware('can:view-dashboard')
        ->name('dashboard');

    // POS
    Route::get('pos', [PosController::class, 'index'])
        ->middleware('can:create-sale')
        ->name('pos.index');
    Route::post('pos', [PosController::class, 'store'])
        ->middleware('can:create-sale')
        ->name('pos.store');
    Route::post('pos/hold', [PosController::class, 'hold'])
        ->middleware('can:create-sale')
        ->name('pos.hold');
    Route::post('pos/{sale}/void', [PosController::class, 'void'])
        ->middleware('can:create-sale')
        ->name('pos.void');

    // Products
    Route::resource('products', ProductController::class)
        ->middleware('can:manage-products');

    // Inventory
    Route::get('inventory', [InventoryController::class, 'index'])
        ->middleware('can:manage-inventory')
        ->name('inventory.index');
    Route::get('inventory/movements', [InventoryController::class, 'movements'])
        ->middleware('can:manage-inventory')
        ->name('inventory.movements');
    Route::post('inventory/adjust', [InventoryController::class, 'adjust'])
        ->middleware('can:manage-inventory')
        ->name('inventory.adjust');

    // Customers
    Route::resource('customers', CustomerController::class)
        ->middleware('can:manage-customers');

    // Expenses
    Route::resource('expenses', ExpenseController::class)
        ->middleware('can:manage-expenses');

    // Reports & Analytics Suite
    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('can:view-reports')
        ->name('reports.index');
    Route::get('reports/daily-sales', [ReportController::class, 'dailySales'])
        ->middleware('can:view-reports')
        ->name('reports.daily-sales');
    Route::get('reports/product-sales', [ReportController::class, 'productSales'])
        ->middleware('can:view-reports')
        ->name('reports.product-sales');
    Route::get('reports/category-sales', [ReportController::class, 'categorySales'])
        ->middleware('can:view-reports')
        ->name('reports.category-sales');
    Route::get('reports/customer-sales', [ReportController::class, 'customerSales'])
        ->middleware('can:view-reports')
        ->name('reports.customer-sales');
    Route::get('reports/payment-sales', [ReportController::class, 'paymentSales'])
        ->middleware('can:view-reports')
        ->name('reports.payment-sales');
    Route::get('reports/inventory-sales', [ReportController::class, 'inventorySales'])
        ->middleware('can:view-reports')
        ->name('reports.inventory-sales');
    Route::get('reports/profit-sales', [ReportController::class, 'profitSales'])
        ->middleware('can:view-reports')
        ->name('reports.profit-sales');
    Route::get('reports/expiry-report', [ReportController::class, 'expiryReport'])
        ->middleware('can:view-reports')
        ->name('reports.expiry-report');
    Route::get('reports/sales/{sale}', [ReportController::class, 'showInvoice'])
        ->middleware('can:view-reports')
        ->name('reports.show-invoice');

    // Forecasts
    Route::get('forecasts', [ForecastController::class, 'index'])
        ->middleware('can:view-forecast')
        ->name('forecasts.index');
    Route::post('forecasts/retrain', [ForecastController::class, 'retrain'])
        ->middleware('can:view-forecast')
        ->name('forecasts.retrain');

    // Users (Admin only)
    Route::resource('users', UserController::class)
        ->middleware('can:manage-users')
        ->except(['show', 'destroy']);

    // AI Assistant
    Route::post('ai/chat', [AIController::class, 'chat'])->name('ai.chat');
    Route::get('ai/history', [AIController::class, 'history'])->name('ai.history');
    Route::post('ai/clear', [AIController::class, 'clear'])->name('ai.clear');
    Route::get('ai-assistant', function () {
        return Inertia\Inertia::render('ai-assistant');
    })->name('ai-assistant.index');
});

require __DIR__.'/settings.php';
