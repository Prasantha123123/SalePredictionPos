<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesPrediction extends Model
{
    use HasFactory;

    protected $fillable = [
        'prediction_date',
        'predicted_amount',
        'actual_amount',
        'model_used',
        'features',
        'confidence',
    ];

    protected $casts = [
        'prediction_date' => 'date',
        'predicted_amount' => 'decimal:2',
        'actual_amount' => 'decimal:2',
        'features' => 'array',
        'confidence' => 'decimal:2',
    ];
}
