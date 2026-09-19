import { useState } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import {
    FolderKanban,
    Plus,
    Search,
    Edit2,
    CheckCircle2,
    XCircle,
    Trash2,
    Package,
    ArrowUpDown,
    Check,
    X,
    Layers,
    ShieldAlert,
    ExternalLink,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

interface Category {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    products_count: number;
    created_at: string;
}

interface Props {
    categories: {
        data: Category[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    stats: {
        total: number;
        active: number;
        inactive: number;
        total_products: number;
    };
    filters: {
        search?: string;
        status?: string;
    };
    canManage: boolean;
}

export default function CategoriesIndex({ categories, stats, filters, canManage }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [statusToggleCategory, setStatusToggleCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // Form
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/categories',
            {
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            },
            { preserveState: true }
        );
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/categories',
            {
                search: search || undefined,
                status: status !== 'all' ? status : undefined,
            },
            { preserveState: true }
        );
    };

    const openCreateModal = () => {
        clearErrors();
        reset();
        setData({
            name: '',
            description: '',
            is_active: true,
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        clearErrors();
        setEditingCategory(category);
        setData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active,
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/categories', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        put(`/categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditingCategory(null);
                reset();
            },
        });
    };

    const handleToggleStatus = (category: Category) => {
        router.patch(
            `/categories/${category.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setStatusToggleCategory(null),
            }
        );
    };

    const handleDelete = (category: Category) => {
        router.delete(`/categories/${category.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingCategory(null),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/products' },
                { title: 'Categories', href: '/categories' },
            ]}
        >
            <Head title="Category Management - Smart POS" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 lg:p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
                                <FolderKanban className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Category Management
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Create, organize, and manage product categories for catalog & POS terminal operations
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-xl border-border/80 text-xs font-semibold gap-1.5 h-10"
                        >
                            <Link href="/products">
                                <Package className="size-4 text-muted-foreground" />
                                <span>View Products</span>
                            </Link>
                        </Button>

                        {canManage && (
                            <Button
                                onClick={openCreateModal}
                                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5 cursor-pointer"
                            >
                                <Plus className="size-4" />
                                <span>Add Category</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Categories</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Layers className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-extrabold text-foreground mt-2">{stats.total}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Configured taxonomies</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{stats.active}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Selectable in product forms</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inactive</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <XCircle className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{stats.inactive}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Disabled from new selections</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-xs relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products Catalog</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Package className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                            {Number(stats.total_products).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Categorized catalog items</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/70 p-3 rounded-2xl shadow-xs">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search categories by name or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-8 h-9 rounded-xl bg-background border-border/60 text-xs"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    router.get('/categories', { status: statusFilter !== 'all' ? statusFilter : undefined }, { preserveState: true });
                                }}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </form>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 self-center sm:self-auto">
                        <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
                            <Filter className="size-3" /> Status:
                        </span>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                statusFilter === 'all'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('active')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                statusFilter === 'active'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            Active ({stats.active})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('inactive')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                statusFilter === 'inactive'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            Inactive ({stats.inactive})
                        </button>
                    </div>
                </div>

                {/* Categories Table */}
                <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border/70 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3.5">Category Name</th>
                                    <th className="px-5 py-3.5">Description</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-center">Products</th>
                                    <th className="px-5 py-3.5">Created Date</th>
                                    {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {categories.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 6 : 5} className="py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
                                                    <FolderKanban className="size-6" />
                                                </div>
                                                <p className="font-semibold text-foreground text-sm">No categories found</p>
                                                <p className="text-xs text-muted-foreground max-w-sm">
                                                    {search
                                                        ? `No categories match your search term "${search}".`
                                                        : 'Get started by creating your first product category.'}
                                                </p>
                                                {canManage && !search && (
                                                    <Button onClick={openCreateModal} size="sm" className="mt-2 rounded-xl text-xs">
                                                        <Plus className="size-3.5 mr-1" /> Add Category
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    categories.data.map((category) => (
                                        <tr key={category.id} className="hover:bg-muted/30 transition-colors group">
                                            {/* Name */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                                        {category.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-foreground text-xs">{category.name}</span>
                                                        <span className="block text-[10px] text-muted-foreground">ID: #{category.id}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Description */}
                                            <td className="px-5 py-3.5 max-w-xs truncate text-muted-foreground">
                                                {category.description ? (
                                                    <span>{category.description}</span>
                                                ) : (
                                                    <span className="italic text-muted-foreground/60">No description</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-5 py-3.5 text-center">
                                                {category.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        <span className="size-1.5 rounded-full bg-amber-500" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>

                                            {/* Products Count */}
                                            <td className="px-5 py-3.5 text-center">
                                                <Link
                                                    href={`/products?category_id=${category.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-blue-500/10 hover:text-blue-600 transition-colors font-semibold"
                                                    title={`View ${category.products_count} product(s) in ${category.name}`}
                                                >
                                                    <Package className="size-3.5" />
                                                    <span>{category.products_count}</span>
                                                    <ExternalLink className="size-2.5 opacity-60 ml-0.5" />
                                                </Link>
                                            </td>

                                            {/* Created Date */}
                                            <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {new Date(category.created_at).toLocaleDateString('en-LK', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </td>

                                            {/* Actions */}
                                            {canManage && (
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Edit Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(category)}
                                                            className="size-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400 cursor-pointer"
                                                            title="Edit Category"
                                                        >
                                                            <Edit2 className="size-3.5" />
                                                        </Button>

                                                        {/* Status Toggle Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setStatusToggleCategory(category)}
                                                            className={`size-8 rounded-lg cursor-pointer ${
                                                                category.is_active
                                                                    ? 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50'
                                                                    : 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50'
                                                            }`}
                                                            title={category.is_active ? 'Deactivate Category' : 'Activate Category'}
                                                        >
                                                            {category.is_active ? (
                                                                <XCircle className="size-3.5" />
                                                            ) : (
                                                                <CheckCircle2 className="size-3.5" />
                                                            )}
                                                        </Button>

                                                        {/* Delete Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeletingCategory(category)}
                                                            className="size-8 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 cursor-pointer"
                                                            title={category.products_count > 0 ? 'Cannot delete: has associated products' : 'Delete Category'}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {categories.links && categories.links.length > 3 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/20 text-xs">
                            <span className="text-muted-foreground">
                                Showing {categories.from || 0} to {categories.to || 0} of {categories.total} categories
                            </span>
                            <div className="flex items-center gap-1">
                                {categories.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-lg font-medium transition-all ${
                                            link.active
                                                ? 'bg-blue-600 text-white font-bold'
                                                : link.url
                                                ? 'hover:bg-muted text-foreground'
                                                : 'text-muted-foreground/40 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Category Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                <Plus className="size-4" />
                            </div>
                            <span>Create New Category</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define a new product classification to group inventory items and filter POS terminal products.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Category Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                required
                                placeholder="e.g. Exercise Books, Writing Instruments"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="h-10 rounded-xl"
                            />
                            {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Description <span className="text-muted-foreground font-normal">(Optional)</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Short description of products categorized under this group..."
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                            {errors.description && <p className="text-[11px] text-red-500">{errors.description}</p>}
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="size-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="is_active" className="text-xs font-medium text-foreground cursor-pointer select-none">
                                Mark as Active (Immediately available in product dropdowns)
                            </label>
                        </div>

                        <DialogFooter className="pt-3 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-xl text-xs h-10"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-10 px-5 cursor-pointer"
                            >
                                {processing ? 'Saving...' : 'Save Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Category Modal */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                <Edit2 className="size-4" />
                            </div>
                            <span>Edit Category</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Modify category title, description, or toggle catalog visibility.
                        </DialogDescription>
                    </DialogHeader>

                    {editingCategory && (
                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Description <span className="text-muted-foreground font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                                {errors.description && <p className="text-[11px] text-red-500">{errors.description}</p>}
                            </div>

                            <div className="flex items-center gap-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="size-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="edit_is_active" className="text-xs font-medium text-foreground cursor-pointer select-none">
                                    Category is Active
                                </label>
                            </div>

                            <DialogFooter className="pt-3 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingCategory(null)}
                                    className="rounded-xl text-xs h-10"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-10 px-5 cursor-pointer"
                                >
                                    {processing ? 'Updating...' : 'Update Category'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Status Toggle Confirmation Modal */}
            <Dialog open={!!statusToggleCategory} onOpenChange={(open) => !open && setStatusToggleCategory(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {statusToggleCategory?.is_active ? (
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                    <XCircle className="size-4" />
                                </div>
                            ) : (
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="size-4" />
                                </div>
                            )}
                            <span>
                                {statusToggleCategory?.is_active ? 'Deactivate Category?' : 'Activate Category?'}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {statusToggleCategory?.is_active ? (
                                <span>
                                    Deactivating <strong>&quot;{statusToggleCategory?.name}&quot;</strong> will hide it from the Add/Edit Product dropdowns. Existing {statusToggleCategory?.products_count} associated product(s) will remain completely intact.
                                </span>
                            ) : (
                                <span>
                                    Activating <strong>&quot;{statusToggleCategory?.name}&quot;</strong> will immediately make it selectable for new and existing products across catalog management.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStatusToggleCategory(null)}
                            className="rounded-xl text-xs h-10"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => statusToggleCategory && handleToggleStatus(statusToggleCategory)}
                            className={`rounded-xl text-white text-xs font-semibold h-10 px-5 cursor-pointer ${
                                statusToggleCategory?.is_active
                                    ? 'bg-amber-600 hover:bg-amber-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500'
                            }`}
                        >
                            {statusToggleCategory?.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
                                <ShieldAlert className="size-4" />
                            </div>
                            <span>Delete Category</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {deletingCategory && deletingCategory.products_count > 0 ? (
                                <div className="space-y-2 mt-1">
                                    <p className="font-semibold text-red-600 dark:text-red-400">
                                        Action Blocked: Data Safety Protection
                                    </p>
                                    <p>
                                        Category <strong>&quot;{deletingCategory.name}&quot;</strong> currently has{' '}
                                        <span className="font-bold text-foreground">{deletingCategory.products_count}</span> associated product(s).
                                    </p>
                                    <p className="text-muted-foreground">
                                        To prevent breaking product catalog integrity and foreign key constraints, categories with products cannot be deleted. Please deactivate the category or reassign its products first.
                                    </p>
                                </div>
                            ) : (
                                <span>
                                    Are you sure you want to permanently delete category <strong>&quot;{deletingCategory?.name}&quot;</strong>? This action cannot be undone.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletingCategory(null)}
                            className="rounded-xl text-xs h-10"
                        >
                            {deletingCategory && deletingCategory.products_count > 0 ? 'Close' : 'Cancel'}
                        </Button>
                        {deletingCategory && deletingCategory.products_count === 0 && (
                            <Button
                                type="button"
                                onClick={() => handleDelete(deletingCategory)}
                                className="rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold h-10 px-5 cursor-pointer"
                            >
                                Permanently Delete
                            </Button>
                        )}
                        {deletingCategory && deletingCategory.products_count > 0 && (
                            <Button
                                type="button"
                                onClick={() => {
                                    const cat = deletingCategory;
                                    setDeletingCategory(null);
                                    setStatusToggleCategory(cat);
                                }}
                                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold h-10 px-5 cursor-pointer"
                            >
                                Deactivate Instead
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
