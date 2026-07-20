<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use Illuminate\Support\Carbon;

class RecommendationService
{
    /**
     * Get stock and business suggestions.
     */
    public function getRecommendations(): array
    {
        $recommendations = [];

        // 1. Check expired soon batches
        $expiringSoon = InventoryBatch::with('product')
            ->where('status', 'active')
            ->whereBetween('expiry_date', [Carbon::today(), Carbon::today()->addDays(7)])
            ->limit(3)
            ->get();

        foreach ($expiringSoon as $batch) {
            $recommendations[] = "Product '{$batch->product->name}' (Batch: {$batch->batch_number}) expires soon on {$batch->expiry_date->format('Y-m-d')}.";
        }

        // 2. Check low stock items
        $lowStock = Inventory::with('product')
            ->whereColumn('quantity', '<=', 'low_stock_threshold')
            ->limit(3)
            ->get();

        foreach ($lowStock as $inv) {
            if ($inv->product) {
                $recommendations[] = "Stock for '{$inv->product->name}' is low ({$inv->quantity} remaining). You should reorder this SKU.";
            }
        }

        return $recommendations;
    }
}
