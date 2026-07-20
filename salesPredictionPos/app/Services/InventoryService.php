<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function __construct(
        protected ExpiryService $expiryService
    ) {}

    /**
     * Add stock for a product.
     */
    public function addStock(
        int $productId,
        int $quantity,
        string $reference = '',
        string $notes = '',
        ?string $expiryDate = null,
        ?string $batchNumber = null,
        ?string $manufactureDate = null,
        float $costPrice = 0.0
    ): InventoryMovement {
        return DB::transaction(function () use ($productId, $quantity, $reference, $notes, $expiryDate, $batchNumber, $manufactureDate, $costPrice) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrCreate(
                ['product_id' => $productId],
                ['quantity' => 0, 'low_stock_threshold' => 10]
            );
            $inventory->increment('quantity', $quantity);

            $product = Product::find($productId);

            // If product has expiry enabled or batch data is provided, log the batch
            if ($product && ($product->has_expiry || $expiryDate)) {
                if ($expiryDate) {
                    $bNum = $batchNumber ?: 'BATCH-' . now()->format('Ymd') . '-' . rand(100, 999);
                    InventoryBatch::create([
                        'product_id' => $productId,
                        'batch_number' => $bNum,
                        'quantity' => $quantity,
                        'cost_price' => $costPrice ?: (float) $product->cost,
                        'manufacture_date' => $manufactureDate,
                        'expiry_date' => $expiryDate,
                        'status' => 'active',
                    ]);
                } else {
                    $this->expiryService->restoreStockFEFO($productId, $quantity);
                }
            }

            $movement = InventoryMovement::create([
                'product_id' => $productId,
                'type' => 'in',
                'quantity' => $quantity,
                'reference' => $reference,
                'notes' => $notes,
                'user_id' => Auth::id(),
            ]);

            AuditService::log('stock_in', 'Product', $productId, null, [
                'quantity' => $quantity,
                'new_total' => $inventory->fresh()->quantity,
            ]);

            return $movement;
        });
    }

    /**
     * Remove stock for a product.
     */
    public function removeStock(int $productId, int $quantity, string $reference = '', string $notes = ''): InventoryMovement
    {
        return DB::transaction(function () use ($productId, $quantity, $reference, $notes) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();

            if ($inventory->quantity < $quantity) {
                throw new \RuntimeException("Insufficient stock for product ID {$productId}. Available: {$inventory->quantity}, Requested: {$quantity}");
            }

            $inventory->decrement('quantity', $quantity);

            // Deduct batches using FEFO
            $this->expiryService->deductStockFEFO($productId, $quantity);

            $movement = InventoryMovement::create([
                'product_id' => $productId,
                'type' => 'out',
                'quantity' => $quantity,
                'reference' => $reference,
                'notes' => $notes,
                'user_id' => Auth::id(),
            ]);

            AuditService::log('stock_out', 'Product', $productId, null, [
                'quantity' => $quantity,
                'new_total' => $inventory->fresh()->quantity,
            ]);

            return $movement;
        });
    }

    /**
     * Adjust stock for a product (set to specific quantity).
     */
    public function adjustStock(int $productId, int $newQuantity, string $notes = ''): InventoryMovement
    {
        return DB::transaction(function () use ($productId, $newQuantity, $notes) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrCreate(
                ['product_id' => $productId],
                ['quantity' => 0, 'low_stock_threshold' => 10]
            );
            $difference = $newQuantity - $inventory->quantity;
            $oldQuantity = $inventory->quantity;

            $inventory->update(['quantity' => $newQuantity]);

            if ($difference > 0) {
                // Treated as stock add without batch properties
                $product = Product::find($productId);
                if ($product && $product->has_expiry) {
                    InventoryBatch::create([
                        'product_id' => $productId,
                        'batch_number' => 'ADJ-' . now()->format('YmdHis'),
                        'quantity' => $difference,
                        'status' => 'active',
                        'expiry_date' => now()->addDays(30), // default buffer
                    ]);
                }
            } elseif ($difference < 0) {
                // Deduct batches using FEFO
                $this->expiryService->deductStockFEFO($productId, abs($difference));
            }

            $movement = InventoryMovement::create([
                'product_id' => $productId,
                'type' => 'adjustment',
                'quantity' => abs($difference),
                'reference' => 'ADJUSTMENT',
                'notes' => $notes ?: "Adjusted from {$oldQuantity} to {$newQuantity}",
                'user_id' => Auth::id(),
            ]);

            AuditService::log('stock_adjustment', 'Product', $productId, [
                'old_quantity' => $oldQuantity,
            ], [
                'new_quantity' => $newQuantity,
            ]);

            return $movement;
        });
    }

    /**
     * Get low stock products.
     */
    public function getLowStockItems(): \Illuminate\Database\Eloquent\Collection
    {
        return Inventory::with('product')
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->get();
    }
}
