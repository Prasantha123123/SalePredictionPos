<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService,
    ) {}

    public function index(Request $request): Response
    {
        $query = Inventory::with('product.category');

        if ($request->input('low_stock')) {
            $query->whereColumn('quantity', '<=', 'low_stock_threshold');
        }

        if ($search = $request->input('search')) {
            $query->whereHas('product', fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")
            );
        }

        return Inertia::render('inventory/index', [
            'inventory' => $query->paginate(15)->withQueryString(),
            'lowStockCount' => Inventory::whereColumn('quantity', '<=', 'low_stock_threshold')->count(),
            'filters' => $request->only(['search', 'low_stock']),
        ]);
    }

    public function movements(Request $request): Response
    {
        $query = InventoryMovement::with('product', 'user')->latest();

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        return Inertia::render('inventory/movements', [
            'movements' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['product_id']),
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'action' => 'required|in:add,remove,set',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        match ($validated['action']) {
            'add' => $this->inventoryService->addStock(
                $validated['product_id'],
                $validated['quantity'],
                'MANUAL-ADD',
                $validated['notes'] ?? ''
            ),
            'remove' => $this->inventoryService->removeStock(
                $validated['product_id'],
                $validated['quantity'],
                'MANUAL-REMOVE',
                $validated['notes'] ?? ''
            ),
            'set' => $this->inventoryService->adjustStock(
                $validated['product_id'],
                $validated['quantity'],
                $validated['notes'] ?? ''
            ),
        };

        return redirect()->route('inventory.index')
            ->with('success', 'Stock updated successfully.');
    }
}
