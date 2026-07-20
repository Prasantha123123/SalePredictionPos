<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'batch_number',
        'quantity',
        'cost_price',
        'manufacture_date',
        'expiry_date',
        'received_date',
        'status',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'cost_price' => 'decimal:2',
        'manufacture_date' => 'date',
        'expiry_date' => 'date',
        'received_date' => 'date',
    ];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
