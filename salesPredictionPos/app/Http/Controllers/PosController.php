<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        protected SaleService $saleService,
    ) {}

    /**
     * Show the POS billing screen.
     */
    public function index(): Response
    {
        return Inertia::render('pos', [
            'products' => Product::with('category', 'inventory')
                ->where('is_active', true)
                ->get()
                ->map(fn (Product $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'price' => (float) $p->price,
                    'category' => $p->category->name,
                    'category_id' => $p->category_id,
                    'stock' => $p->inventory?->quantity ?? 0,
                    'image' => $p->image,
                ]),
            'categories' => Category::where('is_active', true)
                ->select('id', 'name')
                ->get(),
            'customers' => Customer::select('id', 'name', 'phone')
                ->orderBy('name')
                ->get(),
            'heldOrders' => Sale::with('items.product')
                ->where('status', 'held')
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Process a sale.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'discount_code' => 'nullable|string',
            'payment_method' => 'required|in:cash,card,digital',
            'notes' => 'nullable|string|max:500',
        ]);

        $sale = $this->saleService->createSale($validated);

        return redirect()->route('pos.index')
            ->with('success', "Sale {$sale->invoice_number} completed successfully! Total: Rs. " . number_format($sale->total, 2));
    }

    /**
     * Hold an order for later.
     */
    public function hold(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $sale = $this->saleService->holdSale($validated);

        return redirect()->route('pos.index')
            ->with('success', "Order {$sale->invoice_number} held successfully.");
    }

    /**
     * Void a sale.
     */
    public function void(Sale $sale): RedirectResponse
    {
        $this->saleService->voidSale($sale);

        return redirect()->route('pos.index')
            ->with('success', "Sale {$sale->invoice_number} has been voided.");
    }
}
