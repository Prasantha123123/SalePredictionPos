<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function __construct(
        protected ExpiryService $expiryService
    ) {}

    /**
     * Add stock for a product, creating a new inventory batch.
     */
    public function addStock(
        int $productId,
        int $quantity,
        string $reference = '',
        string $notes = '',
        ?int $supplierId = null,
        ?string $batchNumber = null,
        float $purchasePrice = 0.0,
        float $sellingPrice = 0.0,
        ?string $manufactureDate = null,
        ?string $expiryDate = null,
        ?string $purchaseDate = null
    ): InventoryMovement {
        return DB::transaction(function () use (
            $productId, $quantity, $reference, $notes, $supplierId,
            $batchNumber, $purchasePrice, $sellingPrice, $manufactureDate, $expiryDate, $purchaseDate
        ) {
            $product = Product::findOrFail($productId);
            
            // If no supplier_id is provided, find first or create default
            if (! $supplierId) {
                $supplier = Supplier::first() ?: Supplier::create([
                    'company_name' => 'Default Supplier',
                    'supplier_name' => 'Default',
                    'phone' => '0000000000',
                ]);
                $supplierId = $supplier->id;
            }

            // Create new batch
            if (empty($batchNumber)) {
                $nextSeq = InventoryBatch::where('product_id', $productId)->count() + 1;
                $batchSeq = str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
                $cleanSku = str_replace(' ', '-', strtoupper($product->sku ?: 'PROD'));
                $bNum = "BAT-{$cleanSku}-{$batchSeq}";
            } else {
                $bNum = $batchNumber;
            }
            InventoryBatch::create([
                'product_id' => $productId,
                'supplier_id' => $supplierId,
                'batch_number' => $bNum,
                'purchase_price' => $purchasePrice ?: (float) $product->cost,
                'selling_price' => $sellingPrice ?: (float) $product->price,
                'quantity_received' => $quantity,
                'available_quantity' => $quantity,
                'manufacture_date' => $manufactureDate,
                'expiry_date' => $expiryDate,
                'purchase_date' => $purchaseDate ?: now()->format('Y-m-d'),
                'created_by' => Auth::id(),
                'status' => 'active',
            ]);

            // Sync master product prices if needed
            if ($sellingPrice > 0) {
                $product->update(['price' => $sellingPrice]);
            }
            if ($purchasePrice > 0) {
                $product->update(['cost' => $purchasePrice]);
            }

            // Recalculate summary stock
            $totalStock = InventoryBatch::where('product_id', $productId)
                ->where('status', 'active')
                ->sum('available_quantity');

            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrCreate(
                ['product_id' => $productId],
                ['quantity' => 0, 'low_stock_threshold' => 10]
            );
            $inventory->update(['quantity' => $totalStock]);

            $movement = InventoryMovement::create([
                'product_id' => $productId,
                'type' => 'in',
                'quantity' => $quantity,
                'reference' => $reference,
                'notes' => $notes,
                'user_id' => Auth::id(),
            ]);

            AuditService::log('stock_in', 'Product', $productId, null, [
                'batch_number' => $bNum,
                'quantity' => $quantity,
                'new_total' => $totalStock,
            ]);

            return $movement;
        });
    }

    /**
     * Remove stock for a product (e.g. for general disposal, wastage, or sales).
     *
     * @return array<int, array{batch_id: int, quantity: int, purchase_price: float, selling_price: float}>
     */
    public function removeStock(int $productId, int $quantity, string $reference = '', string $notes = ''): array
    {
        return DB::transaction(function () use ($productId, $quantity, $reference, $notes) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();

            if ($inventory->quantity < $quantity) {
                throw new \RuntimeException("Insufficient stock for product ID {$productId}. Available: {$inventory->quantity}, Requested: {$quantity}");
            }

            // Deduct batches using FEFO
            $consumed = $this->expiryService->deductStockFEFO($productId, $quantity);

            // Recalculate summary stock
            $totalStock = InventoryBatch::where('product_id', $productId)
                ->where('status', 'active')
                ->sum('available_quantity');

            $inventory->update(['quantity' => $totalStock]);

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
                'new_total' => $totalStock,
            ]);

            return $consumed;
        });
    }

    /**
     * Restore stock for a product, adding back to a specific batch.
     */
    public function restoreStock(int $productId, int $quantity, string $reference = '', string $notes = '', ?int $batchId = null): void
    {
        DB::transaction(function () use ($productId, $quantity, $reference, $notes, $batchId) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrCreate(
                ['product_id' => $productId],
                ['quantity' => 0, 'low_stock_threshold' => 10]
            );

            // Restore in batches using ExpiryService
            $this->expiryService->restoreStockFEFO($productId, $quantity, $batchId);

            // Recalculate summary stock
            $totalStock = InventoryBatch::where('product_id', $productId)
                ->where('status', 'active')
                ->sum('available_quantity');

            $inventory->update(['quantity' => $totalStock]);

            InventoryMovement::create([
                'product_id' => $productId,
                'type' => 'in',
                'quantity' => $quantity,
                'reference' => $reference,
                'notes' => $notes,
                'user_id' => Auth::id(),
            ]);

            AuditService::log('stock_in_restore', 'Product', $productId, null, [
                'quantity' => $quantity,
                'new_total' => $totalStock,
            ]);
        });
    }

    /**
     * Adjust stock for a product (force set to specific quantity).
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

            if ($difference > 0) {
                // Add positive adjustment as a new batch
                $product = Product::find($productId);
                $supplier = Supplier::first() ?: Supplier::create([
                    'company_name' => 'Default Supplier',
                    'supplier_name' => 'Default',
                    'phone' => '0000000000',
                ]);

                InventoryBatch::create([
                    'product_id' => $productId,
                    'supplier_id' => $supplier->id,
                    'batch_number' => 'ADJ-' . now()->format('YmdHis'),
                    'purchase_price' => $product ? $product->cost : 0.0,
                    'selling_price' => $product ? $product->price : 0.0,
                    'quantity_received' => $difference,
                    'available_quantity' => $difference,
                    'purchase_date' => now()->format('Y-m-d'),
                    'created_by' => Auth::id(),
                    'status' => 'active',
                ]);
            } elseif ($difference < 0) {
                // Deduct negative adjustment using FEFO
                $this->expiryService->deductStockFEFO($productId, abs($difference));
            }

            // Sync total stock
            $totalStock = InventoryBatch::where('product_id', $productId)
                ->where('status', 'active')
                ->sum('available_quantity');

            $inventory->update(['quantity' => $totalStock]);

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
