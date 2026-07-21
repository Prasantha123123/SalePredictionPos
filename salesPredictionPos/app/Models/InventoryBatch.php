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
        'supplier_id',
        'batch_number',
        'purchase_price',
        'selling_price',
        'quantity_received',
        'available_quantity',
        'manufacture_date',
        'expiry_date',
        'purchase_date',
        'created_by',
        'status',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'quantity_received' => 'integer',
        'available_quantity' => 'integer',
        'manufacture_date' => 'date',
        'expiry_date' => 'date',
        'purchase_date' => 'date',
    ];

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
