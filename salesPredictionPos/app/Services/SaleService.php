<?php

namespace App\Services;

use App\Models\Discount;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        protected InventoryService $inventoryService,
    ) {}

    /**
     * Create a new sale with items and automatically update inventory.
     *
     * @param  array{
     *     customer_id?: int|null,
     *     items: array<int, array{product_id: int, batch_id: int, quantity: int, unit_price: float, discount?: float}>,
     *     discount_code?: string|null,
     *     payment_method: string,
     *     notes?: string|null
     * }  $data
     */
    public function createSale(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $subtotal = 0;
            $discountAmount = 0;

            // Calculate subtotal from items
            foreach ($data['items'] as $item) {
                $itemDiscount = $item['discount'] ?? 0;
                $itemTotal = ($item['unit_price'] * $item['quantity']) - $itemDiscount;
                $subtotal += $itemTotal;
            }

            // Apply discount code if provided
            if (! empty($data['discount_code'])) {
                $discount = Discount::where('code', $data['discount_code'])->first();
                if ($discount && $discount->isValid() && $subtotal >= $discount->min_spend) {
                    if ($discount->type === 'percentage') {
                        $discountAmount = round($subtotal * ($discount->value / 100), 2);
                    } else {
                        $discountAmount = min($discount->value, $subtotal);
                    }
                    $discount->increment('used_count');
                }
            }

            $total = $subtotal - $discountAmount;

            // Generate invoice number
            $invoiceNumber = $this->generateInvoiceNumber();

            // Create the sale
            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => Auth::id(),
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => 0,
                'total' => $total,
                'payment_method' => $data['payment_method'],
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
            ]);

            // Create sale items and deduct stock from chosen batch
            foreach ($data['items'] as $item) {
                $batch = InventoryBatch::findOrFail($item['batch_id']);

                if ($batch->product_id != $item['product_id']) {
                    throw new \Exception("Batch {$batch->batch_number} does not belong to the selected product.");
                }

                if ($batch->available_quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock in selected batch {$batch->batch_number}. Available: {$batch->available_quantity}, requested: {$item['quantity']}.");
                }

                // Deduct from the selected batch
                $batch->decrement('available_quantity', $item['quantity']);
                if ($batch->available_quantity <= 0) {
                    $batch->update(['status' => 'depleted']);
                }

                // Log Inventory Movement
                InventoryMovement::create([
                    'product_id' => $item['product_id'],
                    'type' => 'out',
                    'quantity' => $item['quantity'],
                    'reference' => "SALE-{$invoiceNumber}",
                    'notes' => "Sold in invoice {$invoiceNumber} from batch {$batch->batch_number}",
                    'user_id' => Auth::id(),
                ]);

                // Sync total stock cache in the inventory table
                $totalStock = InventoryBatch::where('product_id', $item['product_id'])
                    ->where('status', 'active')
                    ->sum('available_quantity');
                Inventory::where('product_id', $item['product_id'])->update(['quantity' => $totalStock]);

                // Create Sale Item
                $itemDiscount = $item['discount'] ?? 0;
                $batchTotal = ($item['unit_price'] * $item['quantity']) - $itemDiscount;
                $batchProfit = $batchTotal - ($batch->purchase_price * $item['quantity']);

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'batch_id' => $batch->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'purchase_price' => $batch->purchase_price,
                    'selling_price' => $batch->selling_price,
                    'discount' => $itemDiscount,
                    'total' => $batchTotal,
                    'profit' => $batchProfit,
                ]);
            }

            // Create payment record
            Payment::create([
                'sale_id' => $sale->id,
                'method' => $data['payment_method'],
                'amount' => $total,
            ]);

            AuditService::log('sale_created', 'Sale', $sale->id, null, [
                'invoice_number' => $invoiceNumber,
                'total' => $total,
                'items_count' => count($data['items']),
            ]);

            return $sale->load('items.product', 'customer', 'payments');
        });
    }

    /**
     * Hold a sale for later.
     */
    public function holdSale(array $data): Sale
    {
        $data['status'] = 'held';

        return DB::transaction(function () use ($data) {
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $itemDiscount = $item['discount'] ?? 0;
                $subtotal += ($item['unit_price'] * $item['quantity']) - $itemDiscount;
            }

            $sale = Sale::create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => Auth::id(),
                'subtotal' => $subtotal,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total' => $subtotal,
                'payment_method' => 'cash',
                'status' => 'held',
                'notes' => $data['notes'] ?? 'Held order',
            ]);

            foreach ($data['items'] as $item) {
                $itemDiscount = $item['discount'] ?? 0;
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $itemDiscount,
                    'total' => ($item['unit_price'] * $item['quantity']) - $itemDiscount,
                ]);
            }

            return $sale->load('items.product');
        });
    }

    /**
     * Void a sale and restore inventory.
     */
    public function voidSale(Sale $sale): Sale
    {
        return DB::transaction(function () use ($sale) {
            $sale->load('items');

            // Restore inventory for each item
            foreach ($sale->items as $item) {
                $this->inventoryService->restoreStock(
                    $item->product_id,
                    $item->quantity,
                    "VOID-{$sale->invoice_number}",
                    "Voided from invoice {$sale->invoice_number}",
                    $item->batch_id
                );
            }

            $sale->update(['status' => 'voided']);

            AuditService::log('sale_voided', 'Sale', $sale->id, [
                'total' => $sale->total,
            ], null);

            return $sale;
        });
    }

    /**
     * Generate a unique invoice number.
     */
    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . now()->format('Ymd') . '-';
        $lastSale = Sale::where('invoice_number', 'like', $prefix . '%')
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastSale) {
            $lastNumber = (int) substr($lastSale->invoice_number, strlen($prefix));
            return $prefix . str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        }

        return $prefix . '001';
    }
}
