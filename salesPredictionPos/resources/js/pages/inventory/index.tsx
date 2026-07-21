import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeftRight, Box, Minus, Plus, Search, Settings, ChevronDown, ChevronUp, Edit2, Calendar, FileText, Landmark, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Supplier {
    id: number;
    company_name: string;
    supplier_code: string;
}

interface Batch {
    id: number;
    supplier_id: number;
    batch_number: string;
    purchase_price: number;
    selling_price: number;
    quantity_received: number;
    available_quantity: number;
    manufacture_date: string | null;
    expiry_date: string | null;
    purchase_date: string;
    status: 'active' | 'depleted' | 'expired' | 'disposed';
    supplier?: Supplier;
}

interface InventoryItem {
    id: number;
    product_id: number;
    quantity: number;
    low_stock_threshold: number;
    product: {
        id: number;
        name: string;
        sku: string;
        price: number;
        cost: number;
        has_expiry: boolean;
        category: {
            id: number;
            name: string;
        } | null;
        batches: Batch[];
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
    canManage: boolean;
    canCorrectExpiryOnly: boolean;
}

export default function InventoryIndex({ inventory, lowStockCount = 0, filters, canManage, canCorrectExpiryOnly }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [adjustAction, setAdjustAction] = useState<'add' | 'remove' | 'set'>('add');
    const [adjustQty, setAdjustQty] = useState<number>(0);
    const [adjustNotes, setAdjustNotes] = useState('');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    
    // Batch UI states
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    
    // Form fields for MANUAL-ADD batch
    const [batchSupplierId, setBatchSupplierId] = useState<number | ''>('');
    const [batchNumber, setBatchNumber] = useState('');
    const [purchasePrice, setPurchasePrice] = useState<number>(0);
    const [sellingPrice, setSellingPrice] = useState<number>(0);
    const [manufactureDate, setManufactureDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));

    // Batch Editing states
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [showEditBatchModal, setShowEditBatchModal] = useState(false);
    const [editBatchNumber, setEditBatchNumber] = useState('');
    const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
    const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
    const [editQtyReceived, setEditQtyReceived] = useState<number>(0);
    const [editExpiryDate, setEditExpiryDate] = useState('');
    const [editManufactureDate, setEditManufactureDate] = useState('');

    // Fetch suppliers list for dropdown usage
    useEffect(() => {
        if (adjustAction === 'add' && showAdjustModal) {
            fetch('/suppliers/dropdown')
                .then(r => r.json())
                .then(data => {
                    setSuppliers(data);
                    if (data.length > 0) {
                        setBatchSupplierId(data[0].id);
                    }
                });
        }
    }, [adjustAction, showAdjustModal]);

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

    const toggleRow = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAdjustModal = (item: InventoryItem, action: 'add' | 'remove' | 'set') => {
        setSelectedItem(item);
        setAdjustAction(action);
        setAdjustQty(0);
        setAdjustNotes('');
        
        // Populate standard additions defaults
        if (action === 'add') {
            const nextSeq = (item.product.batches?.length || 0) + 1;
            const batchSeq = String(nextSeq).padStart(3, '0');
            const cleanSku = item.product.sku ? item.product.sku.replace(/\s+/g, '-').toUpperCase() : 'PROD';
            setBatchNumber(`BAT-${cleanSku}-${batchSeq}`);
            setPurchasePrice(item.product.cost || 0);
            setSellingPrice(item.product.price || 0);
            setManufactureDate('');
            setExpiryDate('');
            setPurchaseDate(new Date().toISOString().slice(0, 10));
        }

        setShowAdjustModal(true);
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        const payload: Record<string, any> = {
            product_id: selectedItem.product_id,
            action: adjustAction,
            quantity: adjustQty,
            notes: adjustNotes
        };

        if (adjustAction === 'add') {
            payload.supplier_id = batchSupplierId;
            payload.batch_number = batchNumber;
            payload.purchase_price = purchasePrice;
            payload.selling_price = sellingPrice;
            payload.manufacture_date = manufactureDate || null;
            payload.expiry_date = expiryDate || null;
            payload.purchase_date = purchaseDate;
        }

        router.post('/inventory/adjust', payload, {
            onSuccess: () => {
                setShowAdjustModal(false);
                setSelectedItem(null);
            }
        });
    };

    // Open Edit Batch modal
    const openEditBatch = (batch: Batch) => {
        setEditingBatch(batch);
        setEditBatchNumber(batch.batch_number);
        setEditPurchasePrice(batch.purchase_price);
        setEditSellingPrice(batch.selling_price);
        setEditQtyReceived(batch.quantity_received);
        setEditExpiryDate(batch.expiry_date || '');
        setEditManufactureDate(batch.manufacture_date || '');
        setShowEditBatchModal(true);
    };

    const handleEditBatchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBatch) return;

        router.put(`/inventory/batches/${editingBatch.id}`, {
            batch_number: editBatchNumber,
            purchase_price: editPurchasePrice,
            selling_price: editSellingPrice,
            quantity_received: editQtyReceived,
            expiry_date: editExpiryDate || null,
            manufacture_date: editManufactureDate || null,
        }, {
            onSuccess: () => {
                setShowEditBatchModal(false);
                setEditingBatch(null);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory & Batches', href: '/inventory' }]}>
            <Head title="Inventory & Batch Control - Smart POS" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Inventory & Batch Control
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Audit batch tracking, configure supplier costs, run FEFO checks, and adjust inventory levels.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="h-9 px-4 rounded-xl border-border/60 font-semibold text-xs gap-1.5"
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
                        <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by product name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-9.5 rounded-xl bg-card border-border/60 text-xs"
                        />
                    </form>

                    <Button
                        type="button"
                        onClick={toggleLowStockFilter}
                        variant={filters.low_stock === '1' ? 'default' : 'outline'}
                        className={`h-9.5 px-4 rounded-xl font-bold text-xs gap-2 ${
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
                                        <th className="px-4 py-3.5 text-center w-10"></th>
                                        <th className="px-4 py-3.5 text-left">Product Name</th>
                                        <th className="px-4 py-3.5 text-left">SKU</th>
                                        <th className="px-4 py-3.5 text-left">Category</th>
                                        <th className="px-4 py-3.5 text-right">In Stock (Total)</th>
                                        <th className="px-4 py-3.5 text-right">Min Threshold</th>
                                        <th className="px-4 py-3.5 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-right">Stock Adjustments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {inventory.data.map((item) => {
                                        const isLowStock = item.quantity <= item.low_stock_threshold;
                                        const isExpanded = expandedRows[item.id] || false;
                                        return (
                                            <>
                                                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                                    <td className="px-4 py-3.5 text-center">
                                                        <button onClick={() => toggleRow(item.id)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                                                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                                        </button>
                                                    </td>
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
                                                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-extrabold gap-1 text-[10px] rounded-full">
                                                                <AlertTriangle className="size-3" /> Low Stock
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] rounded-full">
                                                                Optimal Stock
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => openAdjustModal(item, 'add')}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[10px] flex items-center gap-1"
                                                                >
                                                                    <Plus className="size-3" /> Update Stock
                                                                </button>
                                                            )}
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => openAdjustModal(item, 'remove')}
                                                                    className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-[10px] flex items-center gap-1"
                                                                >
                                                                    <Minus className="size-3" /> Deduct
                                                                </button>
                                                            )}
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => openAdjustModal(item, 'set')}
                                                                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-bold text-[10px] flex items-center gap-1"
                                                                >
                                                                    <Settings className="size-3" /> Override
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Batch Detail Panel */}
                                                {isExpanded && (
                                                    <tr className="bg-muted/10">
                                                        <td colSpan={8} className="px-6 py-4">
                                                            <div className="space-y-3">
                                                                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5 pb-2 border-b border-border/40">
                                                                    <span>Batch Inventory History</span>
                                                                </h4>
                                                                <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
                                                                    <table className="w-full text-left text-[11px]">
                                                                        <thead>
                                                                            <tr className="border-b border-border/40 bg-muted/30 font-semibold text-muted-foreground">
                                                                                <th className="px-3 py-2">Batch Number</th>
                                                                                <th className="px-3 py-2">Supplier</th>
                                                                                <th className="px-3 py-2 text-right">Received</th>
                                                                                <th className="px-3 py-2 text-right">Available</th>
                                                                                <th className="px-3 py-2 text-right">Purchase Price</th>
                                                                                <th className="px-3 py-2 text-right">Selling Price</th>
                                                                                <th className="px-3 py-2">Manufacture Date</th>
                                                                                <th className="px-3 py-2">Expiry Date</th>
                                                                                <th className="px-3 py-2 text-center">Status</th>
                                                                                <th className="px-3 py-2 text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-border/30">
                                                                            {item.product.batches && item.product.batches.length > 0 ? (
                                                                                item.product.batches.map((b) => (
                                                                                    <tr key={b.id} className="hover:bg-muted/20">
                                                                                        <td className="px-3 py-2 font-mono font-bold text-foreground">{b.batch_number}</td>
                                                                                        <td className="px-3 py-2 font-medium text-foreground">{b.supplier?.company_name || 'N/A'}</td>
                                                                                        <td className="px-3 py-2 text-right font-mono">{b.quantity_received}</td>
                                                                                        <td className="px-3 py-2 text-right font-mono font-black">{b.available_quantity}</td>
                                                                                        <td className="px-3 py-2 text-right font-mono">Rs. {numberFormat(b.purchase_price)}</td>
                                                                                        <td className="px-3 py-2 text-right font-mono">Rs. {numberFormat(b.selling_price)}</td>
                                                                                        <td className="px-3 py-2 text-muted-foreground">{b.manufacture_date || 'N/A'}</td>
                                                                                        <td className="px-3 py-2 text-muted-foreground">
                                                                                            {b.expiry_date ? (
                                                                                                <span className={new Date(b.expiry_date) < new Date() ? 'text-destructive font-bold' : ''}>
                                                                                                    {b.expiry_date}
                                                                                                </span>
                                                                                            ) : 'N/A'}
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-center">
                                                                                            <Badge className={
                                                                                                b.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] rounded-full' :
                                                                                                b.status === 'depleted' ? 'bg-muted text-muted-foreground border-border text-[9px] rounded-full' :
                                                                                                'bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] rounded-full'
                                                                                            }>
                                                                                                {b.status}
                                                                                            </Badge>
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-right">
                                                                                            {canManage && (
                                                                                                <button onClick={() => openEditBatch(b)} className="p-1 hover:bg-muted text-muted-foreground hover:text-blue-600 rounded-lg">
                                                                                                    <Edit2 className="size-3.5" />
                                                                                                </button>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))
                                                                            ) : (
                                                                                <tr>
                                                                                    <td colSpan={10} className="text-center py-4 text-muted-foreground">
                                                                                        No batch inventory records linked to this item.
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
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
                <DialogContent className="sm:max-w-md rounded-2xl p-6 text-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold">
                            {adjustAction === 'add' ? 'Update Stock (New Batch)' : adjustAction === 'remove' ? 'Deduct Stock' : 'Override Stock Level'}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedItem && (
                        <form onSubmit={handleAdjustSubmit} className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto px-1 py-2">
                            <div className="p-3 rounded-xl bg-muted/40 text-xs">
                                <span className="font-bold">{selectedItem.product.name}</span>
                                <span className="text-muted-foreground ml-2">(SKU: {selectedItem.product.sku})</span>
                            </div>

                            {adjustAction === 'add' ? (
                                <>
                                    {/* Multi-field Batch form */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Supplier *</label>
                                            <select
                                                value={batchSupplierId}
                                                onChange={(e) => setBatchSupplierId(parseInt(e.target.value) || '')}
                                                className="h-9.5 rounded-xl border border-input bg-card px-3 py-1 text-xs focus-visible:outline-hidden"
                                                required
                                            >
                                                {suppliers.length > 0 ? (
                                                    suppliers.map(s => (
                                                        <option key={s.id} value={s.id}>{s.company_name}</option>
                                                    ))
                                                ) : (
                                                    <option value="">No Active Suppliers</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Batch Number *</label>
                                            <Input
                                                value={batchNumber}
                                                onChange={(e) => setBatchNumber(e.target.value)}
                                                className="h-9.5 rounded-xl text-xs"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Purchase Cost Price (Rs.) *</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={purchasePrice}
                                                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Selling Retail Price (Rs.) *</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={sellingPrice}
                                                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Quantity Received *</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={adjustQty}
                                                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Purchase/Received Date *</label>
                                            <Input
                                                type="date"
                                                value={purchaseDate}
                                                onChange={(e) => setPurchaseDate(e.target.value)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Manufacture Date</label>
                                            <Input
                                                type="date"
                                                value={manufactureDate}
                                                onChange={(e) => setManufactureDate(e.target.value)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="font-semibold text-muted-foreground">Expiry Date</label>
                                            <Input
                                                type="date"
                                                value={expiryDate}
                                                onChange={(e) => setExpiryDate(e.target.value)}
                                                className="h-9.5 rounded-xl text-xs font-mono"
                                                required={selectedItem.product.has_expiry}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid gap-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Current Quantity</label>
                                        <Input disabled value={selectedItem.quantity} className="h-9.5 bg-muted/50 rounded-xl" />
                                    </div>

                                    <div className="grid gap-1">
                                        <label className="text-xs font-semibold text-muted-foreground">
                                            {adjustAction === 'remove' ? 'Quantity to Deduct *' : 'New Target Quantity *'}
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            required
                                            value={adjustQty}
                                            onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                                            className="h-9.5 rounded-xl text-xs font-mono"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="grid gap-1">
                                <label className="text-xs font-semibold text-muted-foreground">Adjustment Notes / Purchase Order Reference</label>
                                <Input
                                    placeholder="e.g. Shipment arrival reference, audit recount"
                                    value={adjustNotes}
                                    onChange={(e) => setAdjustNotes(e.target.value)}
                                    className="h-9.5 rounded-xl text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                                <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)} className="h-9.5 rounded-xl text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-9.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                                    Save Stock Update
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* EDIT BATCH MODAL */}
            <Dialog open={showEditBatchModal} onOpenChange={setShowEditBatchModal}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6 text-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold">
                            Edit Inventory Batch
                        </DialogTitle>
                    </DialogHeader>

                    {editingBatch && (
                        <form onSubmit={handleEditBatchSubmit} className="space-y-4 mt-2">
                            <div className="p-3 rounded-xl bg-muted/40 text-xs">
                                <span className="font-bold">Editing Batch details</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-muted-foreground">Batch Number</label>
                                    <Input
                                        value={editBatchNumber}
                                        onChange={(e) => setEditBatchNumber(e.target.value)}
                                        className="h-9.5 rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-muted-foreground">Expiry Date</label>
                                    <Input
                                        type="date"
                                        value={editExpiryDate}
                                        onChange={(e) => setEditExpiryDate(e.target.value)}
                                        className="h-9.5 rounded-xl text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-muted-foreground">Cost (Purchase)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editPurchasePrice}
                                        onChange={(e) => setEditPurchasePrice(parseFloat(e.target.value) || 0)}
                                        className="h-9.5 rounded-xl text-xs font-mono"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-muted-foreground">Retail (Selling)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editSellingPrice}
                                        onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                                        className="h-9.5 rounded-xl text-xs font-mono"
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-muted-foreground">Qty Received</label>
                                    <Input
                                        type="number"
                                        value={editQtyReceived}
                                        onChange={(e) => setEditQtyReceived(parseInt(e.target.value) || 0)}
                                        className="h-9.5 rounded-xl text-xs font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="font-semibold text-muted-foreground">Manufacture Date</label>
                                <Input
                                    type="date"
                                    value={editManufactureDate}
                                    onChange={(e) => setEditManufactureDate(e.target.value)}
                                    className="h-9.5 rounded-xl text-xs font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                                <Button type="button" variant="outline" onClick={() => setShowEditBatchModal(false)} className="h-9.5 rounded-xl text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-9.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                                    Save Batch Details
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function numberFormat(val: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}
