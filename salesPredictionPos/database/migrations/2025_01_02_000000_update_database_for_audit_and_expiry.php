<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update products table for expiry tracking
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('has_expiry')->default(false)->after('is_active');
        });

        // 2. Create inventory_batches table for FEFO batch tracking
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('batch_number');
            $table->integer('quantity')->default(0);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->date('manufacture_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('received_date')->useCurrent();
            $table->enum('status', ['active', 'depleted', 'expired', 'disposed'])->default('active');
            $table->timestamps();

            // Indexes for fast searching and expiration queries
            $table->index(['product_id', 'status']);
            $table->index('expiry_date');
        });

        // 3. Update sales_predictions to store performance metrics
        Schema::table('sales_predictions', function (Blueprint $table) {
            $table->json('metrics')->nullable()->after('confidence');
        });

        // 4. Add performance indexes
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->index(['sale_id', 'product_id']);
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->index(['product_id', 'type', 'created_at']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['date', 'category']);
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['date', 'category']);
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'type', 'created_at']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropIndex(['sale_id', 'product_id']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('sales_predictions', function (Blueprint $table) {
            $table->dropColumn('metrics');
        });

        Schema::dropIfExists('inventory_batches');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('has_expiry');
        });
    }
};
