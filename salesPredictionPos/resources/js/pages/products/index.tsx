import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Edit, Grid, LayoutList, Package, Plus, Save, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode?: string | null;
    price: string | number;
    cost?: string | number;
    description?: string | null;
    is_active: boolean;
    category_id?: number;
    category?: { id: number; name: string };
    inventory?: { quantity: number; low_stock_threshold: number } | null;
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    products: {
        data: Product[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    categories: Category[];
    filters: { search?: string; category_id?: string };
}

function formatCurrency(amount: string | number) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ProductsIndex({ products, categories = [], filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Product Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        price: '',
        cost: '',
        description: '',
        is_active: true,
        initial_stock: '0',
        low_stock_threshold: '10',
    });

    const openCreateModal = () => {
        setEditingProduct(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        clearErrors();
        setData({
            name: product.name || '',
            sku: product.sku || '',
            barcode: product.barcode || '',
            category_id: product.category_id ? product.category_id.toString() : product.category?.id ? product.category.id.toString() : '',
            price: product.price ? product.price.toString() : '',
            cost: product.cost ? product.cost.toString() : '',
            description: product.description || '',
            is_active: product.is_active,
            initial_stock: product.inventory?.quantity ? product.inventory.quantity.toString() : '0',
            low_stock_threshold: product.inventory?.low_stock_threshold ? product.inventory.low_stock_threshold.toString() : '10',
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            put(`/products/${editingProduct.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/products', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/products', { search, category_id: filters.category_id }, { preserveState: true });
    };

    const handleDelete = (product: Product) => {
        if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
            router.delete(`/products/${product.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Product Catalog', href: '/products' }]}>
            <Head title="Products - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Products Catalogue
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Manage retail SKUs, pricing strategies, barcodes, and inventory thresholds.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Switcher */}
                        <div className="flex items-center p-1 rounded-xl bg-muted border border-border/60">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="List Table View"
                            >
                                <LayoutList className="size-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    viewMode === 'grid' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Grid Cards View"
                            >
                                <Grid className="size-4" />
                            </button>
                        </div>

                        <Button
                            onClick={openCreateModal}
                            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                        >
                            <Plus className="size-4" />
                            <span>Add Product</span>
                        </Button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by product name, SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-xl bg-card border-border/60 text-xs"
                        />
                    </form>

                    <Select
                        value={filters.category_id || 'all'}
                        onValueChange={(val) =>
                            router.get('/products', { ...filters, category_id: val === 'all' ? undefined : val }, { preserveState: true })
                        }
                    >
                        <SelectTrigger className="h-10 w-full sm:w-48 rounded-xl bg-card border-border/60 text-xs">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Content Area */}
                {products.data.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No Products Found"
                        description="There are no items matching your criteria. Try resetting search filters or add a new SKU."
                        actionLabel="Add New Product"
                        onAction={openCreateModal}
                    />
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Product Name</th>
                                        <th className="px-4 py-3.5 text-left">SKU</th>
                                        <th className="px-4 py-3.5 text-left">Category</th>
                                        <th className="px-4 py-3.5 text-right">Selling Price</th>
                                        <th className="px-4 py-3.5 text-right">Stock Level</th>
                                        <th className="px-4 py-3.5 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {products.data.map((product) => {
                                        const qty = product.inventory?.quantity ?? 0;
                                        const threshold = product.inventory?.low_stock_threshold ?? 5;
                                        const isLowStock = qty <= threshold;

                                        return (
                                            <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5 font-bold text-foreground">{product.name}</td>
                                                <td className="px-4 py-3.5 font-mono text-muted-foreground">{product.sku}</td>
                                                <td className="px-4 py-3.5">
                                                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                                        {product.category?.name || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-black text-foreground">{formatCurrency(product.price)}</td>
                                                <td className="px-4 py-3.5 text-right font-bold">
                                                    <span className={isLowStock ? 'text-amber-500' : 'text-emerald-500'}>
                                                        {qty} units
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <Badge className={product.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}>
                                                        {product.is_active ? 'Active' : 'Disabled'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => openEditModal(product)} className="text-muted-foreground hover:text-blue-600">
                                                            <Edit className="size-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(product)} className="text-muted-foreground hover:text-destructive">
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Grid Cards View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.data.map((product) => {
                            const qty = product.inventory?.quantity ?? 0;
                            return (
                                <div key={product.id} className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{product.sku}</span>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => openEditModal(product)} className="text-muted-foreground hover:text-blue-600">
                                                    <Edit className="size-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(product)} className="text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-xs font-bold text-foreground">{product.name}</h3>
                                        <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{product.category?.name}</p>
                                    </div>
                                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                        <span className="text-sm font-black text-foreground">{formatCurrency(product.price)}</span>
                                        <span className="text-xs font-bold text-muted-foreground">{qty} in stock</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CREATE / EDIT PRODUCT POPUP DIALOG */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-xl rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Product Name *</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="e.g. Artisan Dark Coffee Beans 500g"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">SKU *</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="SKU-1002"
                                    value={data.sku}
                                    onChange={(e) => setData('sku', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.sku && <p className="text-[11px] text-destructive">{errors.sku}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Barcode</label>
                                <Input
                                    type="text"
                                    placeholder="8932014820"
                                    value={data.barcode}
                                    onChange={(e) => setData('barcode', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                                <Select
                                    value={data.category_id}
                                    onValueChange={(val) => setData('category_id', val)}
                                >
                                    <SelectTrigger className="h-10 rounded-xl text-xs">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-[11px] text-destructive">{errors.category_id}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Selling Price (LKR) *</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="1500.00"
                                    value={data.price}
                                    onChange={(e) => setData('price', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.price && <p className="text-[11px] text-destructive">{errors.price}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Cost Price (LKR)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="1000.00"
                                    value={data.cost}
                                    onChange={(e) => setData('cost', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            {!editingProduct && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Initial Stock Qty</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.initial_stock}
                                        onChange={(e) => setData('initial_stock', e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Low Stock Warning Limit</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={data.low_stock_threshold}
                                    onChange={(e) => setData('low_stock_threshold', e.target.value)}
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
                                <span>{editingProduct ? 'Update Product' : 'Save Product'}</span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
