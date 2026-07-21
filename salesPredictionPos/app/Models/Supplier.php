<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_code',
        'company_name',
        'supplier_name',
        'contact_person',
        'phone',
        'mobile',
        'email',
        'address',
        'city',
        'district',
        'country',
        'business_registration_no',
        'tax_number',
        'bank_name',
        'bank_account_no',
        'payment_terms',
        'credit_limit',
        'opening_balance',
        'current_balance',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($supplier) {
            if (empty($supplier->supplier_code)) {
                $supplier->supplier_code = static::generateSupplierCode();
            }
        });
    }

    public static function generateSupplierCode(): string
    {
        $latest = static::withTrashed()->orderBy('id', 'desc')->first();
        if (! $latest) {
            return 'SUP0001';
        }
        
        $number = (int) substr($latest->supplier_code, 3);
        return 'SUP' . str_pad($number + 1, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return HasMany<InventoryBatch, $this>
     */
    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
