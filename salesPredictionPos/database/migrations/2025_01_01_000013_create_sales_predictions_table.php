<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_predictions', function (Blueprint $table) {
            $table->id();
            $table->date('prediction_date');
            $table->decimal('predicted_amount', 12, 2);
            $table->decimal('actual_amount', 12, 2)->nullable();
            $table->string('model_used')->default('xgboost');
            $table->json('features')->nullable();
            $table->decimal('confidence', 5, 2)->nullable();
            $table->timestamps();

            $table->index('prediction_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_predictions');
    }
};
