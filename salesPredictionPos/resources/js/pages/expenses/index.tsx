import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Calendar, DollarSign, Edit, Plus, Save, Search, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Expense {
    id: number;
    category: string;
    description: string;
    amount: string | number;
    date: string;
    user?: {
        name: string;
    };
}

interface Props {
    expenses: {
        data: Expense[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    categories: string[];
    filters: { search?: string; category?: string; from?: string; to?: string };
    totalExpenses: number;
}

function formatCurrency(amount: string | number) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ExpensesIndex({ expenses, categories = [], filters, totalExpenses = 0 }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || '');
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        category: categories[0] || 'Utilities',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
    });

    const openCreateModal = () => {
        setEditingExpense(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (exp: Expense) => {
        setEditingExpense(exp);
        clearErrors();
        setData({
            category: exp.category || categories[0] || 'Utilities',
            description: exp.description || '',
            amount: exp.amount ? exp.amount.toString() : '',
            date: exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingExpense) {
            put(`/expenses/${editingExpense.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/expenses', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/expenses', { search, category, from, to }, { preserveState: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setCategory('');
        setFrom('');
        setTo('');
        router.get('/expenses', {}, { preserveState: true });
    };

    const handleDelete = (expense: Expense) => {
        if (confirm(`Are you sure you want to delete this expense record for "${expense.description}"?`)) {
            router.delete(`/expenses/${expense.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Operating Expenses', href: '/expenses' }]}>
            <Head title="Expense Tracker - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Expense Management & Audit
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Record operational expenditures, utilities, vendor payments, and store overheads.
                        </p>
                    </div>

                    <Button
                        onClick={openCreateModal}
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                    >
                        <Plus className="size-4" />
                        <span>Log Expense</span>
                    </Button>
                </div>

                {/* Filter & Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground">Total Filtered Expenses</span>
                            <div className="text-2xl font-black text-foreground mt-1">
                                {formatCurrency(totalExpenses)}
                            </div>
                        </div>
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Wallet className="size-5" />
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="md:col-span-3 p-4 rounded-2xl bg-card border border-border/60 flex flex-wrap items-center gap-2 shadow-xs">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search remarks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-9 rounded-xl bg-background text-xs"
                            />
                        </div>

                        <Button type="submit" className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                            Filter
                        </Button>
                        <Button type="button" onClick={handleClearFilters} variant="outline" className="h-9 px-3 rounded-xl text-xs">
                            Reset
                        </Button>
                    </form>
                </div>

                {/* Expenses Table */}
                {expenses.data.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="No Expense Records"
                        description="No expense logs match the filter criteria. Log new expenses to track net profit margin."
                        actionLabel="Record Expense"
                        onAction={openCreateModal}
                    />
                ) : (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Date</th>
                                        <th className="px-4 py-3.5 text-left">Category</th>
                                        <th className="px-4 py-3.5 text-left">Description</th>
                                        <th className="px-4 py-3.5 text-left">Logged By</th>
                                        <th className="px-4 py-3.5 text-right">Amount</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {expenses.data.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3.5 font-mono text-muted-foreground">
                                                {new Date(exp.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold">
                                                    {exp.category}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-foreground max-w-sm truncate">{exp.description}</td>
                                            <td className="px-4 py-3.5 text-muted-foreground">{exp.user?.name || 'Store Admin'}</td>
                                            <td className="px-4 py-3.5 text-right font-black text-foreground text-sm">{formatCurrency(exp.amount)}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEditModal(exp)} className="text-muted-foreground hover:text-blue-600">
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(exp)} className="text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* RECORD / EDIT EXPENSE POPUP DIALOG */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {editingExpense ? 'Edit Expense Entry' : 'Log Store Expense'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                                <Select
                                    value={data.category}
                                    onValueChange={(val) => setData('category', val)}
                                >
                                    <SelectTrigger className="h-10 rounded-xl text-xs">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(categories.length > 0 ? categories : ['Utilities', 'Rent', 'Salaries', 'Supplies', 'Marketing', 'Maintenance']).map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Description / Remarks *</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="e.g. Monthly electricity bill payment"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.description && <p className="text-[11px] text-destructive">{errors.description}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Amount (LKR) *</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="4500.00"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.amount && <p className="text-[11px] text-destructive">{errors.amount}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Date *</label>
                                <Input
                                    type="date"
                                    required
                                    value={data.date}
                                    onChange={(e) => setData('date', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-10 rounded-xl text-xs">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                            >
                                <Save className="size-4" />
                                <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
