import { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Edit, FolderKanban, Grid, LayoutList, Package, Plus, Save, Search, Trash2, RefreshCw, X } from 'lucide-react';
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
    has_expiry?: boolean;
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
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    categories: Category[];
    filters: { search?: string; category_id?: string; status?: string; per_page?: string };
}

function formatCurrency(amount: string | number) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ProductsIndex({ products, categories = [], filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
        has_expiry: false,
        initial_stock: '0',
        low_stock_threshold: '10',
        batch_number: '',
        expiry_date: '',
        manufacture_date: '',
    });

    // Auto-generate batch number suggestion when SKU, has_expiry, or initial_stock changes
    useEffect(() => {
        if (!editingProduct && (data.has_expiry || parseInt(data.initial_stock) > 0) && !data.batch_number) {
            suggestBatchNumber();
        }
    }, [data.has_expiry, data.initial_stock, data.sku]);

    const suggestBatchNumber = () => {
        const cleanSku = data.sku ? data.sku.replace(/\s+/g, '-').toUpperCase() : 'PROD';
        setData('batch_number', `BAT-${cleanSku}-001`);
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product & { has_expiry?: boolean }) => {
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
            has_expiry: !!product.has_expiry,
            initial_stock: product.inventory?.quantity ? product.inventory.quantity.toString() : '0',
            low_stock_threshold: product.inventory?.low_stock_threshold ? product.inventory.low_stock_threshold.toString() : '10',
            batch_number: '',
            expiry_date: '',
            manufacture_date: '',
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
        router.get(
            '/products',
            {
                search: search || undefined,
                category_id: filters.category_id,
                status: filters.status,
                per_page: filters.per_page,
            },
            { preserveState: true }
        );
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        const newFilters = {
            ...filters,
            search: search || undefined,
            [key]: value === 'all' || !value ? undefined : value,
        };
        router.get('/products', newFilters, { preserveState: true });
    };

    const handleResetFilters = () => {
        setSearch('');
        router.get('/products', {}, { preserveState: true });
    };

    const hasActiveFilters = Boolean(search || filters.category_id || filters.status || (filters.per_page && filters.per_page !== '15'));

    const handleDelete = (product: Product) => {
        if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
            router.delete(`/products/${product.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Product Catalog', href: '/products' }]}>
            <Head title="Products - Smart POS" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                Products Catalogue
                            </h1>
                            <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-xs">
                                {products.total} {products.total === 1 ? 'Product' : 'Products'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Showing {products.from || 0}–{products.to || 0} of {products.total} products available in your catalogue.
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

                        <Link href="/categories">
                            <Button
                                variant="outline"
                                className="h-10 px-3.5 rounded-xl border-border/70 hover:bg-muted font-bold text-xs gap-1.5"
                            >
                                <FolderKanban className="size-4 text-blue-600" />
                                <span>Categories</span>
                            </Button>
                        </Link>

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
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by product name, SKU, or barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-8 h-10 rounded-xl bg-card border-border/60 text-xs"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    router.get('/products', { ...filters, search: undefined }, { preserveState: true });
                                }}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </form>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        {/* Category Filter */}
                        <Select
                            value={filters.category_id || 'all'}
                            onValueChange={(val) => handleFilterChange('category_id', val)}
                        >
                            <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl bg-card border-border/60 text-xs">
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

                        {/* Status Filter */}
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(val) => handleFilterChange('status', val)}
                        >
                            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl bg-card border-border/60 text-xs">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active Only</SelectItem>
                                <SelectItem value="disabled">Disabled Only</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Per Page Selector */}
                        <Select
                            value={filters.per_page || '15'}
                            onValueChange={(val) => handleFilterChange('per_page', val)}
                        >
                            <SelectTrigger className="h-10 w-full sm:w-32 rounded-xl bg-card border-border/60 text-xs">
                                <SelectValue placeholder="15 per page" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 per page</SelectItem>
                                <SelectItem value="25">25 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                                <SelectItem value="100">100 per page</SelectItem>
                                <SelectItem value="all">Show All</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                onClick={handleResetFilters}
                                className="h-10 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                                title="Reset all filters"
                            >
                                <RefreshCw className="size-3.5 mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                {products.data.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No Products Found"
                        description={
                            hasActiveFilters
                                ? 'There are no products matching your search criteria. Try adjusting or clearing your filters.'
                                : 'No products have been added to your catalogue yet.'
                        }
                        actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add New Product'}
                        onAction={hasActiveFilters ? handleResetFilters : openCreateModal}
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
                                                <td className="px-4 py-3.5 font-bold text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <span>{product.name}</span>
                                                        {!!(product as any).has_expiry && (
                                                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[8px] uppercase tracking-wider border border-rose-500/20">
                                                                FEFO
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
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

                {/* Pagination Controls */}
                {products.data.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <div className="text-xs text-muted-foreground">
                            Showing <span className="font-bold text-foreground">{products.from || 0}</span> to{' '}
                            <span className="font-bold text-foreground">{products.to || 0}</span> of{' '}
                            <span className="font-bold text-foreground">{products.total}</span> products
                            {products.last_page > 1 && (
                                <span className="ml-1 font-semibold">
                                    (Page {products.current_page} of {products.last_page})
                                </span>
                            )}
                        </div>

                        {products.links && products.links.length > 3 && (
                            <div className="flex flex-wrap items-center gap-1">
                                {products.links.map((link, idx) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className="px-3 py-1.5 rounded-xl border border-border/40 text-xs text-muted-foreground/50 cursor-not-allowed select-none"
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                                link.active
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                                                    : 'bg-card border-border/60 hover:bg-muted text-foreground'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        )}
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
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                                    <Link
                                        href="/categories"
                                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        + Manage Categories
                                    </Link>
                                </div>
                                <Select
                                    value={data.category_id}
                                    onValueChange={(val) => setData('category_id', val)}
                                >
                                    <SelectTrigger className="h-10 rounded-xl text-xs">
                                        <SelectValue placeholder={categories.length === 0 ? "No active categories available" : "Select Category"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.length === 0 ? (
                                            <div className="p-3 text-center text-xs text-muted-foreground">
                                                No categories found.
                                                <div className="mt-1">
                                                    <Link href="/categories" className="text-blue-600 font-semibold hover:underline">
                                                        Create a category
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        )}
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

                            <div className="col-span-2 flex items-center gap-2 py-1">
                                <input
                                    type="checkbox"
                                    id="has_expiry"
                                    checked={data.has_expiry}
                                    onChange={(e) => setData('has_expiry', e.target.checked)}
                                    className="rounded border-border text-blue-600 focus:ring-blue-500 size-4"
                                />
                                <label htmlFor="has_expiry" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                    Product has Expiry Date (Track inventory batches FEFO)
                                </label>
                            </div>

                            {(data.has_expiry || parseInt(data.initial_stock) > 0) && !editingProduct && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Batch Number *</label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="text"
                                                required
                                                placeholder="e.g. BATCH-001"
                                                value={data.batch_number}
                                                onChange={(e) => setData('batch_number', e.target.value)}
                                                className="h-10 rounded-xl font-mono"
                                            />
                                            <button type="button" onClick={suggestBatchNumber} className="p-2 border border-input rounded-xl hover:bg-muted" title="Re-generate batch suggestion">
                                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                        {errors.batch_number && <p className="text-[11px] text-destructive">{errors.batch_number}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Expiry Date {data.has_expiry && '*'}</label>
                                        <Input
                                            type="date"
                                            required={data.has_expiry}
                                            value={data.expiry_date}
                                            onChange={(e) => setData('expiry_date', e.target.value)}
                                            className="h-10 rounded-xl font-mono"
                                        />
                                        {errors.expiry_date && <p className="text-[11px] text-destructive">{errors.expiry_date}</p>}
                                    </div>
                                    
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-xs font-semibold text-muted-foreground">Manufacture Date</label>
                                        <Input
                                            type="date"
                                            value={data.manufacture_date}
                                            onChange={(e) => setData('manufacture_date', e.target.value)}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                </>
                            )}
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
