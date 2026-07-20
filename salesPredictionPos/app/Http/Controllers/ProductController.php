<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\InventoryBatch;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Product::with('category', 'inventory');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        $products = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => Category::where('is_active', true)->get(),
            'filters' => $request->only(['search', 'category_id']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/create', [
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|max:50|unique:products,sku',
            'barcode' => 'nullable|string|max:50|unique:products,barcode',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'cost' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'has_expiry' => 'boolean',
            'initial_stock' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'batch_number' => 'nullable|required_if:has_expiry,true|string|max:100',
            'expiry_date' => 'nullable|required_if:has_expiry,true|date',
            'manufacture_date' => 'nullable|date',
        ]);

        $product = Product::create($validated);

        // Create inventory record
        Inventory::create([
            'product_id' => $product->id,
            'quantity' => $validated['initial_stock'] ?? 0,
            'low_stock_threshold' => $validated['low_stock_threshold'] ?? 10,
        ]);

        // Create initial batch if product expires and has stock
        if ($product->has_expiry && ($validated['initial_stock'] ?? 0) > 0) {
            InventoryBatch::create([
                'product_id' => $product->id,
                'batch_number' => $validated['batch_number'] ?? 'BATCH-INIT-' . now()->format('Ymd'),
                'quantity' => $validated['initial_stock'],
                'cost_price' => $product->cost,
                'manufacture_date' => $validated['manufacture_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'status' => 'active',
            ]);
        }

        AuditService::log('product_created', 'Product', $product->id, null, $validated);

        return redirect()->route('products.index')
            ->with('success', "Product '{$product->name}' created successfully.");
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('products/edit', [
            'product' => $product->load('inventory'),
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => "required|string|max:50|unique:products,sku,{$product->id}",
            'barcode' => "nullable|string|max:50|unique:products,barcode,{$product->id}",
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'cost' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'has_expiry' => 'boolean',
        ]);

        $oldValues = $product->toArray();
        $product->update($validated);

        AuditService::log('product_updated', 'Product', $product->id, $oldValues, $validated);

        return redirect()->route('products.index')
            ->with('success', "Product '{$product->name}' updated successfully.");
    }

    public function destroy(Product $product): RedirectResponse
    {
        AuditService::log('product_deleted', 'Product', $product->id, $product->toArray(), null);
        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Product deleted successfully.');
    }
}
