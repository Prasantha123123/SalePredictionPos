import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeftRight, Box, Minus, Plus, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface InventoryItem {
    id: number;
    product_id: number;
    quantity: number;
    low_stock_threshold: number;
    product: {
        id: number;
        name: string;
        sku: string;
        category: {
            id: number;
            name: string;
        } | null;
    };
}

interface Props {
    inventory: {
        data: InventoryItem[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    lowStockCount: number;
    filters: { search?: string; low_stock?: string };
}

export default function InventoryIndex({ inventory, lowStockCount = 0, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [adjustAction, setAdjustAction] = useState<'add' | 'remove' | 'set'>('add');
    const [adjustQty, setAdjustQty] = useState<number>(0);
    const [adjustNotes, setAdjustNotes] = useState('');
    const [showAdjustModal, setShowAdjustModal] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/inventory', { search, low_stock: filters.low_stock }, { preserveState: true });
    };

    const toggleLowStockFilter = () => {
        const isCurrentlyLowStock = filters.low_stock === '1';
        router.get('/inventory', {
            search,
            low_stock: isCurrentlyLowStock ? undefined : '1'
        }, { preserveState: true });
    };

    const openAdjustModal = (item: InventoryItem, action: 'add' | 'remove' | 'set') => {
        setSelectedItem(item);
        setAdjustAction(action);
        setAdjustQty(0);
        setAdjustNotes('');
        setShowAdjustModal(true);
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        router.post('/inventory/adjust', {
            product_id: selectedItem.product_id,
            action: adjustAction,
            quantity: adjustQty,
            notes: adjustNotes
        }, {
            onSuccess: () => {
                setShowAdjustModal(false);
                setSelectedItem(null);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory Movements', href: '/inventory' }]}>
            <Head title="Inventory Management - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Inventory & Stock Control
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Track real-time stock levels, adjust warehouse quantities, and audit stock movements.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-border/60 font-semibold text-xs gap-1.5"
                        >
                            <Link href="/inventory/movements">
                                <ArrowLeftRight className="size-4" />
                                <span>Movement Audit Log</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Search & Low Stock Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by product name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-xl bg-card border-border/60 text-xs"
                        />
                    </form>

                    <Button
                        type="button"
                        onClick={toggleLowStockFilter}
                        variant={filters.low_stock === '1' ? 'default' : 'outline'}
                        className={`h-10 px-4 rounded-xl font-bold text-xs gap-2 ${
                            filters.low_stock === '1'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'text-amber-600 border-amber-500/30 hover:bg-amber-500/10'
                        }`}
                    >
                        <AlertTriangle className="size-4" />
                        <span>Low Stock Filter ({lowStockCount})</span>
                    </Button>
                </div>

                {/* Inventory Table */}
                {inventory.data.length === 0 ? (
                    <EmptyState
                        icon={Box}
                        title="No Inventory Records"
                        description="No stock records match the specified filters. Try searching for another product."
                    />
                ) : (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Product Name</th>
                                        <th className="px-4 py-3.5 text-left">SKU</th>
                                        <th className="px-4 py-3.5 text-left">Category</th>
                                        <th className="px-4 py-3.5 text-right">In Stock</th>
                                        <th className="px-4 py-3.5 text-right">Min Threshold</th>
                                        <th className="px-4 py-3.5 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-right">Stock Adjustments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {inventory.data.map((item) => {
                                        const isLowStock = item.quantity <= item.low_stock_threshold;
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5 font-bold text-foreground">
                                                    {item.product?.name || 'Unknown Item'}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-muted-foreground">
                                                    {item.product?.sku || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                                        {item.product?.category?.name || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-black text-foreground text-sm">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-muted-foreground font-semibold">
                                                    {item.low_stock_threshold}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {isLowStock ? (
                                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-extrabold gap-1">
                                                            <AlertTriangle className="size-3" /> Low Stock
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                                                            Optimal Stock
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => openAdjustModal(item, 'add')}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[11px] flex items-center gap-1"
                                                        >
                                                            <Plus className="size-3" /> Add
                                                        </button>
                                                        <button
                                                            onClick={() => openAdjustModal(item, 'remove')}
                                                            className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-[11px] flex items-center gap-1"
                                                        >
                                                            <Minus className="size-3" /> Deduct
                                                        </button>
                                                        <button
                                                            onClick={() => openAdjustModal(item, 'set')}
                                                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-bold text-[11px] flex items-center gap-1"
                                                        >
                                                            <Settings className="size-3" /> Set
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
                )}
            </div>

            {/* ADJUSTMENT MODAL */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {adjustAction === 'add' ? 'Add Stock' : adjustAction === 'remove' ? 'Deduct Stock' : 'Override Stock Level'}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedItem && (
                        <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-2">
                            <div className="p-3 rounded-xl bg-muted/40 text-xs">
                                <span className="font-bold">{selectedItem.product.name}</span>
                                <span className="text-muted-foreground ml-2">(SKU: {selectedItem.product.sku})</span>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-xs font-semibold text-muted-foreground">Current Quantity</label>
                                <Input disabled value={selectedItem.quantity} className="h-10 bg-muted/50 rounded-xl" />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-xs font-semibold text-muted-foreground">
                                    {adjustAction === 'add' ? 'Quantity to Add' : adjustAction === 'remove' ? 'Quantity to Deduct' : 'New Target Quantity'}
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    required
                                    value={adjustQty}
                                    onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-xs font-semibold text-muted-foreground">Adjustment Notes / PO #</label>
                                <Input
                                    placeholder="e.g. Shipment arrival reference, audit recount"
                                    value={adjustNotes}
                                    onChange={(e) => setAdjustNotes(e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)} className="h-10 rounded-xl text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                                    Save Adjustment
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
