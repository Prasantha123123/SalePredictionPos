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
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // POS
    Route::get('pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('pos', [PosController::class, 'store'])->name('pos.store');
    Route::post('pos/hold', [PosController::class, 'hold'])->name('pos.hold');
    Route::post('pos/{sale}/void', [PosController::class, 'void'])->name('pos.void');

    // Products
    Route::resource('products', ProductController::class);

    // Inventory
    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('inventory/movements', [InventoryController::class, 'movements'])->name('inventory.movements');
    Route::post('inventory/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');

    // Customers
    Route::resource('customers', CustomerController::class);

    // Expenses
    Route::resource('expenses', ExpenseController::class);

    // Reports & Analytics Suite
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/daily-sales', [ReportController::class, 'dailySales'])->name('reports.daily-sales');
    Route::get('reports/product-sales', [ReportController::class, 'productSales'])->name('reports.product-sales');
    Route::get('reports/category-sales', [ReportController::class, 'categorySales'])->name('reports.category-sales');
    Route::get('reports/customer-sales', [ReportController::class, 'customerSales'])->name('reports.customer-sales');
    Route::get('reports/payment-sales', [ReportController::class, 'paymentSales'])->name('reports.payment-sales');
    Route::get('reports/inventory-sales', [ReportController::class, 'inventorySales'])->name('reports.inventory-sales');
    Route::get('reports/profit-sales', [ReportController::class, 'profitSales'])->name('reports.profit-sales');
    Route::get('reports/sales/{sale}', [ReportController::class, 'showInvoice'])->name('reports.show-invoice');

    // Forecasts
    Route::get('forecasts', [ForecastController::class, 'index'])->name('forecasts.index');
    Route::post('forecasts/retrain', [ForecastController::class, 'retrain'])->name('forecasts.retrain');

    // Users (Admin only)
    Route::resource('users', UserController::class)->except(['show', 'destroy']);
});

require __DIR__.'/settings.php';
