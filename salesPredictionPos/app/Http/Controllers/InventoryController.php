<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryBatch;
use App\Models\SaleItem;
use App\Services\InventoryService;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService,
    ) {}

    public function index(Request $request): Response
    {
        $query = Inventory::with(['product.category', 'product.batches.supplier']);

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
            'canManage' => Auth::user()->hasAnyRole(['Super Admin', 'Admin', 'Manager']),
            'canCorrectExpiryOnly' => Auth::user()->hasAnyRole(['Super Admin', 'Admin']),
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
            // Batch details required for MANUAL-ADD
            'supplier_id' => 'nullable|required_if:action,add|exists:suppliers,id',
            'batch_number' => 'nullable|required_if:action,add|string|max:100',
            'purchase_price' => 'nullable|required_if:action,add|numeric|min:0',
            'selling_price' => 'nullable|required_if:action,add|numeric|min:0',
            'manufacture_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after_or_equal:purchase_date',
            'purchase_date' => 'nullable|date',
        ]);

        // Prevent duplicate batch numbers for the same product
        if ($validated['action'] === 'add' && ! empty($validated['batch_number'])) {
            $exists = InventoryBatch::where('product_id', $validated['product_id'])
                ->where('batch_number', $validated['batch_number'])
                ->exists();
            if ($exists) {
                return back()->withErrors(['batch_number' => 'This batch number already exists for this product.']);
            }
        }

        match ($validated['action']) {
            'add' => $this->inventoryService->addStock(
                $validated['product_id'],
                $validated['quantity'],
                'MANUAL-ADD',
                $validated['notes'] ?? '',
                $validated['supplier_id'] ?? null,
                $validated['batch_number'] ?? null,
                (float) ($validated['purchase_price'] ?? 0),
                (float) ($validated['selling_price'] ?? 0),
                $validated['manufacture_date'] ?? null,
                $validated['expiry_date'] ?? null,
                $validated['purchase_date'] ?? null
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

    /**
     * Edit a specific inventory batch.
     */
    public function updateBatch(Request $request, InventoryBatch $batch): RedirectResponse
    {
        $usedInSales = SaleItem::where('batch_id', $batch->id)->exists();

        if ($usedInSales) {
            // If batch is used in sales, do NOT allow editing price, batch_number, supplier
            // Only admin can edit expiry_date
            if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
                return back()->with('error', 'Only administrators can correct the expiry date of a batch that has been used in sales.');
            }

            $validated = $request->validate([
                'expiry_date' => 'nullable|date|after_or_equal:purchase_date',
            ]);

            $oldValues = $batch->toArray();
            $batch->update(['expiry_date' => $validated['expiry_date'] ?? null]);

            AuditService::log('batch_expiry_corrected', 'InventoryBatch', $batch->id, $oldValues, $validated);

            return redirect()->route('inventory.index')
                ->with('success', 'Batch expiry date corrected successfully.');
        }

        // If batch is NOT used in sales, allow full editing
        $validated = $request->validate([
            'batch_number' => "required|string|max:100|unique:inventory_batches,batch_number,{$batch->id},id,product_id,{$batch->product_id}",
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'quantity_received' => 'required|integer|min:1',
            'expiry_date' => 'nullable|date|after_or_equal:purchase_date',
            'manufacture_date' => 'nullable|date',
        ]);

        $oldValues = $batch->toArray();
        
        $batch->update([
            'batch_number' => $validated['batch_number'],
            'purchase_price' => $validated['purchase_price'],
            'selling_price' => $validated['selling_price'],
            'quantity_received' => $validated['quantity_received'],
            'available_quantity' => $validated['quantity_received'], // Since it's not sold, available matches received
            'expiry_date' => $validated['expiry_date'] ?? null,
            'manufacture_date' => $validated['manufacture_date'] ?? null,
        ]);

        // Sync total stock summary
        $totalStock = InventoryBatch::where('product_id', $batch->product_id)
            ->where('status', 'active')
            ->sum('available_quantity');

        Inventory::where('product_id', $batch->product_id)->update(['quantity' => $totalStock]);

        AuditService::log('batch_updated', 'InventoryBatch', $batch->id, $oldValues, $validated);

        return redirect()->route('inventory.index')
            ->with('success', 'Inventory batch updated successfully.');
    }
}
