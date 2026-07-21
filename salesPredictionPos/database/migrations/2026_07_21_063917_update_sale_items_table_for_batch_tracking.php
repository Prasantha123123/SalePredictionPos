<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->after('product_id')->constrained('inventory_batches')->onDelete('set null');
            $table->decimal('purchase_price', 10, 2)->default(0)->after('quantity');
            $table->decimal('selling_price', 10, 2)->default(0)->after('purchase_price');
            $table->decimal('profit', 10, 2)->default(0)->after('total');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
            $table->dropColumn(['batch_id', 'purchase_price', 'selling_price', 'profit']);
        });
    }
};
