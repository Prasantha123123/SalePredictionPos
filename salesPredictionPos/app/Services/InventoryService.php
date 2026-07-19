<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Add stock for a product.
     */
    public function addStock(int $productId, int $quantity, string $reference = '', string $notes = ''): InventoryMovement
    {
        return DB::transaction(function () use ($productId, $quantity, $reference, $notes) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $inventory->increment('quantity', $quantity);

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
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $difference = $newQuantity - $inventory->quantity;
            $oldQuantity = $inventory->quantity;

            $inventory->update(['quantity' => $newQuantity]);

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
