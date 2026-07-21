<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\InventoryBatch;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{

    /**
     * Display a listing of suppliers.
     */
    public function index(Request $request): Response
    {
        $query = Supplier::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($district = $request->input('district')) {
            $query->where('district', $district);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $suppliers = $query->latest()->paginate(10)->withQueryString();

        $districts = Supplier::distinct()->whereNotNull('district')->pluck('district')->toArray();

        return Inertia::render('suppliers/index', [
            'suppliers' => $suppliers,
            'districts' => $districts,
            'filters' => $request->only(['search', 'district', 'status']),
            'canManage' => Auth::user()->hasAnyRole(['Super Admin', 'Admin', 'Manager']),
            'canDelete' => Auth::user()->hasAnyRole(['Super Admin', 'Admin']),
        ]);
    }

    /**
     * Store a newly created supplier.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'supplier_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50|unique:suppliers,phone',
            'mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'business_registration_no' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:150',
            'bank_account_no' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'opening_balance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['current_balance'] = $validated['opening_balance'] ?? 0;

        $supplier = Supplier::create($validated);

        AuditService::log('supplier_created', 'Supplier', $supplier->id, null, [
            'supplier_code' => $supplier->supplier_code,
            'company_name' => $supplier->company_name,
        ]);

        return redirect()->route('suppliers.index')
            ->with('success', "Supplier {$supplier->supplier_code} ({$supplier->company_name}) created successfully.");
    }

    /**
     * Display the specified supplier profile.
     */
    public function show(Supplier $supplier): Response
    {
        // Fetch batches supplied by this supplier
        $batches = InventoryBatch::with('product')
            ->where('supplier_id', $supplier->id)
            ->latest()
            ->get();

        // Unique products supplied
        $productsSupplied = $batches->pluck('product')->unique('id')->values()->toArray();

        // Calculate Purchase statistics
        $totalPurchases = $batches->sum(function ($b) {
            return $b->purchase_price * $b->quantity_received;
        });

        $lastSupplyDate = $batches->max('purchase_date');

        return Inertia::render('suppliers/show', [
            'supplier' => $supplier,
            'batches' => $batches,
            'productsSupplied' => $productsSupplied,
            'stats' => [
                'total_purchases' => (float) $totalPurchases,
                'outstanding_balance' => (float) $supplier->current_balance,
                'last_supply_date' => $lastSupplyDate ? $lastSupplyDate->format('Y-m-d') : null,
            ],
            'canManage' => Auth::user()->hasAnyRole(['Super Admin', 'Admin', 'Manager']),
            'canDelete' => Auth::user()->hasAnyRole(['Super Admin', 'Admin']),
        ]);
    }

    /**
     * Update the specified supplier.
     */
    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'supplier_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => "required|string|max:50|unique:suppliers,phone,{$supplier->id}",
            'mobile' => 'nullable|string|max:50',
            'email' => "nullable|email|max:255|unique:suppliers,email,{$supplier->id}",
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'business_registration_no' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:150',
            'bank_account_no' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'opening_balance' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        // Recalculate balance if opening balance changed
        if (isset($validated['opening_balance'])) {
            $diff = $validated['opening_balance'] - $supplier->opening_balance;
            $validated['current_balance'] = $supplier->current_balance + $diff;
        }

        $supplier->update($validated);

        AuditService::log('supplier_updated', 'Supplier', $supplier->id, [
            'company_name' => $supplier->company_name,
        ], $validated);

        return redirect()->route('suppliers.index')
            ->with('success', "Supplier {$supplier->supplier_code} updated successfully.");
    }

    /**
     * Remove the specified supplier (Soft Delete).
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        if (! Auth::user()->hasAnyRole(['Super Admin', 'Admin'])) {
            return redirect()->route('suppliers.index')
                ->with('error', 'Only administrators can delete suppliers.');
        }

        // Check if supplier has any active inventory batches
        $hasBatches = InventoryBatch::where('supplier_id', $supplier->id)->exists();
        if ($hasBatches) {
            return redirect()->route('suppliers.index')
                ->with('error', 'Cannot delete supplier because they have supplied active inventory batches.');
        }

        $supplierCode = $supplier->supplier_code;
        $companyName = $supplier->company_name;

        $supplier->delete();

        AuditService::log('supplier_deleted', 'Supplier', $supplier->id, [
            'supplier_code' => $supplierCode,
            'company_name' => $companyName,
        ], null);

        return redirect()->route('suppliers.index')
            ->with('success', "Supplier {$supplierCode} soft deleted successfully.");
    }

    /**
     * Get suppliers list for dropdown usage.
     */
    public function dropdown(): \Illuminate\Http\JsonResponse
    {
        $suppliers = Supplier::where('status', 'active')
            ->select('id', 'company_name', 'supplier_name', 'supplier_code')
            ->orderBy('company_name')
            ->get();

        return response()->json($suppliers);
    }

    /**
     * Fetch supplier statistics for reporting.
     */
    public function stats(): \Illuminate\Http\JsonResponse
    {
        $totalSuppliers = Supplier::count();
        $activeSuppliers = Supplier::where('status', 'active')->count();
        $totalOutstanding = Supplier::sum('current_balance');

        return response()->json([
            'total' => $totalSuppliers,
            'active' => $activeSuppliers,
            'outstanding' => (float) $totalOutstanding,
        ]);
    }
}
