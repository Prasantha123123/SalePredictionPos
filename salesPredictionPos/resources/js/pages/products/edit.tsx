import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: number;
    price: string;
    cost: string;
    description: string | null;
    is_active: boolean;
    inventory: { quantity: number; low_stock_threshold: number } | null;
}

interface Props {
    product: Product;
    categories: Category[];
}

export default function ProductEdit({ product, categories }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        category_id: String(product.category_id),
        price: product.price,
        cost: product.cost,
        description: product.description || '',
        is_active: product.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/products/${product.id}`);
    };

    return (
        <>
            <Head title={`Edit ${product.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <Link href="/products" className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Product</h1>
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
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>}
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

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                <textarea rows={3} value={data.description} onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Link href="/products" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300">
                                Cancel
                            </Link>
                            <button type="submit" disabled={processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                <Save className="h-4 w-4" /> Update Product
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

ProductEdit.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/products' },
        { title: 'Edit Product', href: '#' },
    ],
};
