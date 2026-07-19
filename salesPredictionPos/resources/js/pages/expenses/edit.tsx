import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

interface Expense {
    id: number;
    category: string;
    description: string;
    amount: string;
    date: string;
}

interface Props {
    expense: Expense;
    categories: string[];
}

export default function ExpenseEdit({ expense, categories }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.split('T')[0],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/expenses/${expense.id}`);
    };

    return (
        <>
            <Head title="Edit Expense Record" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <Link href="/expenses" className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Expense Record</h1>
                </div>

                <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/50">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        list="expense-categories"
                                        value={data.category} 
                                        onChange={(e) => setData('category', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" 
                                    />
                                    <datalist id="expense-categories">
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                                <input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (Rs.) *</label>
                                <input type="number" step="0.01" value={data.amount} onChange={(e) => setData('amount', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
                                <textarea rows={3} value={data.description} onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Link href="/expenses" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300">
                                Cancel
                            </Link>
                            <button type="submit" disabled={processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                <Save className="h-4 w-4" /> Update Expense Record
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

ExpenseEdit.layout = {
    breadcrumbs: [
        { title: 'Expenses', href: '/expenses' },
        { title: 'Edit Expense', href: '#' },
    ],
};
