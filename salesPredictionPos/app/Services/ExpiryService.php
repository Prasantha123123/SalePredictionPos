<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\Product;
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
            ->sum('quantity');

        $expiringToday = InventoryBatch::where('status', 'active')
            ->whereDate('expiry_date', $today)
            ->sum('quantity');

        $expiring3Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDay(), $today->copy()->addDays(3)])
            ->sum('quantity');

        $expiring7Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDays(4), $today->copy()->addDays(7)])
            ->sum('quantity');

        $expiring30Days = InventoryBatch::where('status', 'active')
            ->whereBetween('expiry_date', [$today->copy()->addDays(8), $today->copy()->addDays(30)])
            ->sum('quantity');

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
            'quantity' => $b->quantity,
            'cost_price' => (float) $b->cost_price,
            'expiry_date' => $b->expiry_date ? $b->expiry_date->format('Y-m-d') : null,
            'days_remaining' => $b->expiry_date ? $today->diffInDays($b->expiry_date, false) : null,
            'status' => $b->expiry_date && $b->expiry_date->isPast() ? 'expired' : 'active',
        ])->toArray();
    }

    /**
     * FEFO Stock Deduction Logic.
     * Deducts requested quantity from the oldest expiring active batch first.
     */
    public function deductStockFEFO(int $productId, int $quantity): void
    {
        $product = Product::findOrFail($productId);

        if (! $product->has_expiry) {
            return;
        }

        $remainingToDeduct = $quantity;

        // Fetch active batches with expiry sorted FEFO (First Expiring First Out)
        $batches = InventoryBatch::where('product_id', $productId)
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->get();

        foreach ($batches as $batch) {
            if ($remainingToDeduct <= 0) {
                break;
            }

            if ($batch->quantity >= $remainingToDeduct) {
                $batch->decrement('quantity', $remainingToDeduct);
                if ($batch->fresh()->quantity === 0) {
                    $batch->update(['status' => 'depleted']);
                }
                $remainingToDeduct = 0;
            } else {
                $remainingToDeduct -= $batch->quantity;
                $batch->update([
                    'quantity' => 0,
                    'status' => 'depleted',
                ]);
            }
        }

        // If there's still quantity remaining but no expiring batch covers it (or negative buffer),
        // we create a default batch/deduct from latest fallback
        if ($remainingToDeduct > 0) {
            Log::warning("FEFO: Insufficient expiring batch quantities for product ID {$productId}. Remaining undeducted: {$remainingToDeduct}");
        }
    }

    /**
     * Refund/Restore Stock FEFO (e.g. on sale void).
     * Adds the stock back to the latest non-depleted or active batch.
     */
    public function restoreStockFEFO(int $productId, int $quantity): void
    {
        $product = Product::findOrFail($productId);
        if (! $product->has_expiry) {
            return;
        }

        // Find latest active batch for product
        $batch = InventoryBatch::where('product_id', $productId)
            ->whereIn('status', ['active', 'depleted'])
            ->orderBy('expiry_date', 'desc')
            ->first();

        if ($batch) {
            $batch->increment('quantity', $quantity);
            if ($batch->status === 'depleted') {
                $batch->update(['status' => 'active']);
            }
        } else {
            // Create a new batch
            InventoryBatch::create([
                'product_id' => $productId,
                'batch_number' => 'RESTORED-' . now()->format('YmdHis'),
                'quantity' => $quantity,
                'status' => 'active',
                'expiry_date' => now()->addDays(30), // default buffer
            ]);
        }
    }
}
