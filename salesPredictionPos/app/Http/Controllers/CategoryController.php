<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display a paginated listing of categories with search and status filtering.
     */
    public function index(Request $request): Response
    {
        $query = Category::withCount('products');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $categories = $query->orderBy('name')->paginate(12)->withQueryString();

        $stats = [
            'total' => Category::count(),
            'active' => Category::where('is_active', true)->count(),
            'inactive' => Category::where('is_active', false)->count(),
            'total_products' => Product::count(),
        ];

        return Inertia::render('categories/index', [
            'categories' => $categories,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
            'canManage' => Auth::user()?->can('manage-categories') ?? false,
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(Auth::user()?->can('manage-categories'), 403, 'Unauthorized to create categories.');

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        $category = Category::create([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditService::log('category_created', 'Category', $category->id, null, $category->toArray());

        return redirect()->route('categories.index')
            ->with('success', "Category '{$category->name}' created successfully.");
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        abort_unless(Auth::user()?->can('manage-categories'), 403, 'Unauthorized to update categories.');

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:categories,name,{$category->id}",
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        $oldValues = $category->toArray();

        $category->update([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ]);

        AuditService::log('category_updated', 'Category', $category->id, $oldValues, $category->toArray());

        return redirect()->route('categories.index')
            ->with('success', "Category '{$category->name}' updated successfully.");
    }

    /**
     * Toggle the active status of the specified category.
     */
    public function toggleStatus(Category $category): RedirectResponse
    {
        abort_unless(Auth::user()?->can('manage-categories'), 403, 'Unauthorized to manage category status.');

        $oldStatus = $category->is_active;
        $category->is_active = ! $oldStatus;
        $category->save();

        AuditService::log('category_status_toggled', 'Category', $category->id, [
            'is_active' => $oldStatus,
        ], [
            'is_active' => $category->is_active,
        ]);

        $statusText = $category->is_active ? 'activated' : 'deactivated';

        return redirect()->route('categories.index')
            ->with('success', "Category '{$category->name}' was {$statusText} successfully.");
    }

    /**
     * Remove the specified category if it has no associated products.
     */
    public function destroy(Category $category): RedirectResponse
    {
        abort_unless(Auth::user()?->can('manage-categories'), 403, 'Unauthorized to delete categories.');

        $productCount = $category->products()->count();

        if ($productCount > 0) {
            return redirect()->route('categories.index')->with('error', "Cannot delete category '{$category->name}' because it is associated with {$productCount} product(s). Deactivate the category instead.");
        }

        $oldValues = $category->toArray();
        $name = $category->name;
        $category->delete();

        AuditService::log('category_deleted', 'Category', $category->id, $oldValues, null);

        return redirect()->route('categories.index')
            ->with('success', "Category '{$name}' deleted successfully.");
    }

    /**
     * Get active categories list for AJAX dropdown usage.
     */
    public function dropdown(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }
}
