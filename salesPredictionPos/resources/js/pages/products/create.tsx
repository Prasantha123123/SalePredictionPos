import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

interface Category {
    id: number;
    name: string;
}

interface Props {
    categories: Category[];
}

export default function ProductCreate({ categories }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        price: '',
        cost: '',
        description: '',
        is_active: true,
        has_expiry: false,
        initial_stock: '0',
        low_stock_threshold: '10',
        batch_number: '',
        expiry_date: '',
        manufacture_date: '',
    });

    // Auto-generate batch number suggestion when SKU changes or Initial Stock/Expiry is selected
    useEffect(() => {
        if ((data.has_expiry || parseInt(data.initial_stock) > 0) && !data.batch_number) {
            suggestBatchNumber();
        }
    }, [data.has_expiry, data.initial_stock, data.sku]);

    const suggestBatchNumber = () => {
        const cleanSku = data.sku ? data.sku.replace(/\s+/g, '-').toUpperCase() : 'PROD';
        setData('batch_number', `BAT-${cleanSku}-001`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/products');
    };

    const showBatchFields = data.has_expiry || parseInt(data.initial_stock) > 0;

    return (
        <>
            <Head title="Add Product" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <Link href="/products" className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add Product</h1>
                </div>

                <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/50">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name *</label>
                                <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">SKU *</label>
                                <input type="text" value={data.sku} onChange={(e) => setData('sku', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label>
                                <input type="text" value={data.barcode} onChange={(e) => setData('barcode', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                                <select value={data.category_id} onChange={(e) => setData('category_id', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                                    <option value="">Select category</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label>
                                <input type="number" value={data.low_stock_threshold} onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Selling Price (Rs.) *</label>
                                <input type="number" step="0.01" value={data.price} onChange={(e) => setData('price', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Price (Rs.) *</label>
                                <input type="number" step="0.01" value={data.cost} onChange={(e) => setData('cost', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.cost && <p className="mt-1 text-xs text-red-500">{errors.cost}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Stock</label>
                                <input type="number" value={data.initial_stock} onChange={(e) => setData('initial_stock', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>

                            <div className="flex items-center gap-2 pt-6">
                                <input type="checkbox" id="has_expiry" checked={data.has_expiry} onChange={(e) => setData('has_expiry', e.target.checked)}
                                    className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="has_expiry" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Has Expiry Tracking
                                </label>
                            </div>

                            {/* Conditional Batch Fields (User visible and editable) */}
                            {showBatchFields && (
                                <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2 p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/20 dark:border-indigo-500/30 dark:bg-indigo-500/5 mt-2 animate-fadeIn">
                                    <h3 className="sm:col-span-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                        Initial Inventory Batch Configuration
                                    </h3>

                                    <div className="sm:col-span-2 relative">
                                        <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Batch Number *</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={data.batch_number} onChange={(e) => setData('batch_number', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white font-mono" />
                                            <button type="button" onClick={suggestBatchNumber} className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800" title="Re-generate batch suggestion">
                                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                        {errors.batch_number && <p className="mt-1 text-xs text-red-500">{errors.batch_number}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Expiry Date {data.has_expiry && '*'}</label>
                                        <input type="date" value={data.expiry_date} onChange={(e) => setData('expiry_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white font-mono"
                                            required={data.has_expiry} />
                                        {errors.expiry_date && <p className="mt-1 text-xs text-red-500">{errors.expiry_date}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Manufacture Date</label>
                                        <input type="date" value={data.manufacture_date} onChange={(e) => setData('manufacture_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white font-mono" />
                                        {errors.manufacture_date && <p className="mt-1 text-xs text-red-500">{errors.manufacture_date}</p>}
                                    </div>
                                </div>
                            )}

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                <textarea rows={3} value={data.description} onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Link href="/products" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                                Cancel
                            </Link>
                            <button type="submit" disabled={processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                <Save className="h-4 w-4" /> Save Product
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

ProductCreate.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/products' },
        { title: 'Add Product', href: '/products/create' },
    ],
};
