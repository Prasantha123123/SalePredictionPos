<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExpiryService
{
    /**
     * Get expiry notifications data for the dashboard.
     */
    public function getExpiryAlertSummary(): array
    {
        $today = Carbon::today();

        $expired = InventoryBatch::where('status', 'active')
            ->where('expiry_date', '<', $today)
            ->sum('available_quantity');

        $expiringToday = InventoryBatch::where('status', 'active')
            ->whereDate('expiry_date', $today)
            ->sum('available_quantity');

        $expiring3Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDay(), $today->copy()->addDays(3)])
            ->sum('available_quantity');

        $expiring7Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDays(4), $today->copy()->addDays(7)])
            ->sum('available_quantity');

        $expiring30Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDays(8), $today->copy()->addDays(30)])
            ->sum('available_quantity');

        // Total count of unique batches causing warning states
        $alertCount = InventoryBatch::where('status', 'active')
            ->where('expiry_date', '<=', $today->copy()->addDays(30))
            ->count();

        return [
            'expired' => (int) $expired,
            'expiring_today' => (int) $expiringToday,
            'expiring_3_days' => (int) $expiring3Days,
            'expiring_7_days' => (int) $expiring7Days,
            'expiring_30_days' => (int) $expiring30Days,
            'total_alerts' => $alertCount,
        ];
    }

    /**
     * Get list of batches near expiry or expired.
     */
    public function getExpiringBatchesReport(?string $filter = null): array
    {
        $today = Carbon::today();
        $query = InventoryBatch::with('product')->where('status', 'active');

        switch ($filter) {
            case 'expired':
                $query->where('expiry_date', '<', $today);
                break;
            case 'today':
                $query->whereDate('expiry_date', $today);
                break;
            case 'week':
                $query->whereBetween('expiry_date', [$today, $today->copy()->addDays(7)]);
                break;
            case 'month':
                $query->whereBetween('expiry_date', [$today, $today->copy()->addDays(30)]);
                break;
        }

        return $query->orderBy('expiry_date', 'asc')->get()->map(fn ($b) => [
            'id' => $b->id,
            'product_name' => $b->product->name ?? 'Deleted Product',
            'sku' => $b->product->sku ?? 'N/A',
            'batch_number' => $b->batch_number,
            'quantity' => $b->available_quantity,
            'cost_price' => (float) $b->purchase_price,
            'expiry_date' => $b->expiry_date ? $b->expiry_date->format('Y-m-d') : null,
            'days_remaining' => $b->expiry_date ? $today->diffInDays($b->expiry_date, false) : null,
            'status' => $b->expiry_date && $b->expiry_date->isPast() ? 'expired' : 'active',
        ])->toArray();
    }

    /**
     * FEFO Stock Deduction Logic.
     * Deducts requested quantity from the oldest expiring active batch first.
     * Returns an array of consumed batches with consumed quantities.
     *
     * @return array<int, array{batch_id: int, quantity: int, purchase_price: float, selling_price: float}>
     */
    public function deductStockFEFO(int $productId, int $quantity): array
    {
        $consumed = [];
        $remainingToDeduct = $quantity;

        // Fetch active batches with expiry sorted FEFO (First Expiring First Out)
        // Note: For non-expiring products, we still sort by purchase_date/id
        $batches = InventoryBatch::where('product_id', $productId)
            ->where('status', 'active')
            ->where('available_quantity', '>', 0)
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC, purchase_date ASC')
            ->get();

        foreach ($batches as $batch) {
            if ($remainingToDeduct <= 0) {
                break;
            }

            $deductQty = min($batch->available_quantity, $remainingToDeduct);
            
            $batch->decrement('available_quantity', $deductQty);
            if ($batch->fresh()->available_quantity === 0) {
                $batch->update(['status' => 'depleted']);
            }

            $consumed[] = [
                'batch_id' => $batch->id,
                'quantity' => $deductQty,
                'purchase_price' => (float) $batch->purchase_price,
                'selling_price' => (float) $batch->selling_price,
            ];

            $remainingToDeduct -= $deductQty;
        }

        // Fallback: If we still need stock but no active batches remain, find the last depleted batch or create a default one
        if ($remainingToDeduct > 0) {
            Log::warning("FEFO: Insufficient expiring batch quantities for product ID {$productId}. Remaining undeducted: {$remainingToDeduct}");
            
            // Try to find any batch to force deduct from (creating negative stock on the last batch)
            $lastBatch = InventoryBatch::where('product_id', $productId)
                ->orderBy('purchase_date', 'desc')
                ->first();

            if ($lastBatch) {
                $lastBatch->decrement('available_quantity', $remainingToDeduct);
                $lastBatch->update(['status' => 'active']); // Make it active again since it's active negative

                $consumed[] = [
                    'batch_id' => $lastBatch->id,
                    'quantity' => $remainingToDeduct,
                    'purchase_price' => (float) $lastBatch->purchase_price,
                    'selling_price' => (float) $lastBatch->selling_price,
                ];
            } else {
                // No batches exist at all - create a dummy fallback batch
                $product = Product::find($productId);
                $supplier = Supplier::first() ?: Supplier::create([
                    'company_name' => 'Default Supplier',
                    'supplier_name' => 'Default',
                    'phone' => '0000000000',
                ]);

                $fallbackBatch = InventoryBatch::create([
                    'product_id' => $productId,
                    'supplier_id' => $supplier->id,
                    'batch_number' => 'FALLBACK-' . now()->format('YmdHis'),
                    'purchase_price' => $product ? $product->cost : 0.0,
                    'selling_price' => $product ? $product->price : 0.0,
                    'quantity_received' => 0,
                    'available_quantity' => -$remainingToDeduct,
                    'purchase_date' => now(),
                    'status' => 'active',
                ]);

                $consumed[] = [
                    'batch_id' => $fallbackBatch->id,
                    'quantity' => $remainingToDeduct,
                    'purchase_price' => (float) $fallbackBatch->purchase_price,
                    'selling_price' => (float) $fallbackBatch->selling_price,
                ];
            }
        }

        return $consumed;
    }

    /**
     * Refund/Restore Stock FEFO (e.g. on sale void).
     * Adds the stock back to the specific batch or latest active batch.
     */
    public function restoreStockFEFO(int $productId, int $quantity, ?int $batchId = null): void
    {
        if ($batchId) {
            $batch = InventoryBatch::find($batchId);
            if ($batch) {
                $batch->increment('available_quantity', $quantity);
                if ($batch->status === 'depleted') {
                    $batch->update(['status' => 'active']);
                }
                return;
            }
        }

        // Find latest active/depleted batch for product
        $batch = InventoryBatch::where('product_id', $productId)
            ->whereIn('status', ['active', 'depleted'])
            ->orderBy('purchase_date', 'desc')
            ->first();

        if ($batch) {
            $batch->increment('available_quantity', $quantity);
            if ($batch->status === 'depleted') {
                $batch->update(['status' => 'active']);
            }
        } else {
            // Create a new fallback batch
            $product = Product::find($productId);
            $supplier = Supplier::first() ?: Supplier::create([
                'company_name' => 'Default Supplier',
                'supplier_name' => 'Default',
                'phone' => '0000000000',
            ]);

            InventoryBatch::create([
                'product_id' => $productId,
                'supplier_id' => $supplier->id,
                'batch_number' => 'RESTORED-' . now()->format('YmdHis'),
                'purchase_price' => $product ? $product->cost : 0.0,
                'selling_price' => $product ? $product->price : 0.0,
                'quantity_received' => $quantity,
                'available_quantity' => $quantity,
                'status' => 'active',
                'expiry_date' => now()->addDays(30), // default buffer
            ]);
        }
    }
}
