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
        Schema::dropIfExists('inventory_batches');

        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->string('batch_number');
            $table->decimal('purchase_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->integer('quantity_received')->default(0);
            $table->integer('available_quantity')->default(0);
            $table->date('manufacture_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('purchase_date')->useCurrent();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['active', 'depleted', 'expired', 'disposed'])->default('active');
            $table->timestamps();

            $table->index(['product_id', 'status']);
            $table->index('expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');

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

            $table->index(['product_id', 'status']);
            $table->index('expiry_date');
        });
    }
};
