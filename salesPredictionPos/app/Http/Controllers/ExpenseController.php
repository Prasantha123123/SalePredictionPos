<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Expense::with('user');

        if ($search = $request->input('search')) {
            $query->where('description', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%");
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($from = $request->input('from')) {
            $query->where('date', '>=', $from);
        }

        if ($to = $request->input('to')) {
            $query->where('date', '<=', $to);
        }

        return Inertia::render('expenses/index', [
            'expenses' => $query->latest('date')->paginate(15)->withQueryString(),
            'categories' => Expense::distinct()->pluck('category'),
            'filters' => $request->only(['search', 'category', 'from', 'to']),
            'totalExpenses' => $query->sum('amount'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('expenses/create', [
            'categories' => Expense::distinct()->pluck('category'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'description' => 'required|string|max:500',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
        ]);

        $validated['user_id'] = auth()->id();
        $expense = Expense::create($validated);
        AuditService::log('expense_created', 'Expense', $expense->id, null, $validated);

        return redirect()->route('expenses.index')
            ->with('success', 'Expense recorded successfully.');
    }

    public function edit(Expense $expense): Response
    {
        return Inertia::render('expenses/edit', [
            'expense' => $expense,
            'categories' => Expense::distinct()->pluck('category'),
        ]);
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'description' => 'required|string|max:500',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
        ]);

        $oldValues = $expense->toArray();
        $expense->update($validated);
        AuditService::log('expense_updated', 'Expense', $expense->id, $oldValues, $validated);

        return redirect()->route('expenses.index')
            ->with('success', 'Expense updated successfully.');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        AuditService::log('expense_deleted', 'Expense', $expense->id, $expense->toArray(), null);
        $expense->delete();

        return redirect()->route('expenses.index')
            ->with('success', 'Expense deleted successfully.');
    }
}
