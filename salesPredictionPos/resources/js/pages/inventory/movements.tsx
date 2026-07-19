import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    History,
    Package,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Movement {
    id: number;
    product_id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
    product?: {
        name: string;
        sku: string;
    };
    user?: {
        name: string;
    };
}

interface Props {
    movements: {
        data: Movement[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
}

export default function InventoryMovements({ movements }: Props) {
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');

    // Stats calculations
    const totalInflow = movements.data
        .filter((m) => m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0);

    const totalOutflow = movements.data
        .filter((m) => m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0);

    const totalAdjustments = movements.data.filter((m) => m.type === 'adjustment').length;

    // Client-side filtering
    const filteredMovements = movements.data.filter((m) => {
        const matchesType = selectedType === 'all' || m.type === selectedType;
        const query = search.toLowerCase();
        const matchesSearch =
            !search ||
            (m.product?.name || '').toLowerCase().includes(query) ||
            (m.product?.sku || '').toLowerCase().includes(query) ||
            (m.reference || '').toLowerCase().includes(query) ||
            (m.notes || '').toLowerCase().includes(query);
        return matchesType && matchesSearch;
    });

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Inventory Management', href: '/inventory' },
                { title: 'Stock Movement Audit Log', href: '/inventory/movements' },
            ]}
        >
            <Head title="Stock Movement Audit Log - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-xl shrink-0"
                        >
                            <Link href="/inventory">
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                Stock Movement Audit Trail
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Immutable real-time audit record of product restocks, checkout sales, and stock adjustments.
                            </p>
                        </div>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5"
                    >
                        <Link href="/inventory">
                            <Package className="size-3.5" />
                            <span>Return to Inventory Levels</span>
                        </Link>
                    </Button>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground">Total Audit Entries</span>
                            <div className="text-2xl font-black text-foreground mt-1">
                                {movements.data.length}
                            </div>
                        </div>
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <History className="size-5" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground">Stock Restocks (IN)</span>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <TrendingUp className="size-5" />
                                <span>+{totalInflow.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <ArrowUpRight className="size-5" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground">Sales & Dispatches (OUT)</span>
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                                <TrendingDown className="size-5" />
                                <span>-{totalOutflow.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <ArrowDownRight className="size-5" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground">Stock Corrections</span>
                            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                                {totalAdjustments}
                            </div>
                        </div>
                        <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <RefreshCw className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Filter Controls & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                    {/* Filter Tabs */}
                    <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 w-full sm:w-auto">
                        <button
                            onClick={() => setSelectedType('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                selectedType === 'all'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            All Logs ({movements.data.length})
                        </button>
                        <button
                            onClick={() => setSelectedType('in')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                selectedType === 'in'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ArrowUpRight className="size-3.5" />
                            <span>Inflows (IN)</span>
                        </button>
                        <button
                            onClick={() => setSelectedType('out')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                selectedType === 'out'
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ArrowDownRight className="size-3.5" />
                            <span>Outflows (OUT)</span>
                        </button>
                        <button
                            onClick={() => setSelectedType('adjustment')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                selectedType === 'adjustment'
                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <RefreshCw className="size-3.5" />
                            <span>Adjustments</span>
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Filter product, SKU or reference..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-9 rounded-xl bg-background text-xs"
                        />
                    </div>
                </div>

                {/* Movements Audit Log Table */}
                {filteredMovements.length === 0 ? (
                    <EmptyState
                        icon={History}
                        title="No Audit Records Found"
                        description="No stock movement entries match your search criteria or movement type filter."
                    />
                ) : (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Timestamp</th>
                                        <th className="px-4 py-3.5 text-left">Product & SKU</th>
                                        <th className="px-4 py-3.5 text-center">Movement Type</th>
                                        <th className="px-4 py-3.5 text-right">Quantity</th>
                                        <th className="px-4 py-3.5 text-left">Operator</th>
                                        <th className="px-4 py-3.5 text-left">Reference & Audit Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {filteredMovements.map((m) => {
                                        const dateObj = new Date(m.created_at);
                                        const formattedDate = dateObj.toLocaleDateString('en-LK', {
                                            month: 'short',
                                            day: '2-digit',
                                            year: 'numeric',
                                        });
                                        const formattedTime = dateObj.toLocaleTimeString('en-LK', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        });

                                        return (
                                            <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                                                {/* Timestamp */}
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                                                        <Clock className="size-3.5 text-muted-foreground/70 shrink-0" />
                                                        <span>{formattedDate}</span>
                                                        <span className="text-muted-foreground/50">•</span>
                                                        <span className="font-semibold text-foreground">{formattedTime}</span>
                                                    </div>
                                                </td>

                                                {/* Product Name & SKU */}
                                                <td className="px-4 py-3.5 font-bold text-foreground">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs">{m.product?.name || 'Deleted Product'}</span>
                                                        <span className="text-[10px] font-mono text-muted-foreground font-semibold mt-0.5">
                                                            {m.product?.sku || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Movement Type */}
                                                <td className="px-4 py-3.5 text-center">
                                                    {m.type === 'in' ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold gap-1 px-2.5 py-1">
                                                            <ArrowUpRight className="size-3" />
                                                            <span>INFLOW (IN)</span>
                                                        </Badge>
                                                    ) : m.type === 'out' ? (
                                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold gap-1 px-2.5 py-1">
                                                            <ArrowDownRight className="size-3" />
                                                            <span>OUTFLOW (OUT)</span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold gap-1 px-2.5 py-1">
                                                            <RefreshCw className="size-3" />
                                                            <span>ADJUSTMENT</span>
                                                        </Badge>
                                                    )}
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-4 py-3.5 text-right font-black text-sm">
                                                    <span className={m.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : m.type === 'out' ? 'text-rose-600 dark:text-rose-400' : 'text-purple-600 dark:text-purple-400'}>
                                                        {m.type === 'in' ? `+${m.quantity}` : m.type === 'out' ? `-${m.quantity}` : m.quantity}
                                                    </span>
                                                </td>

                                                {/* Recorded By */}
                                                <td className="px-4 py-3.5 text-muted-foreground font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                                                            {(m.user?.name || 'A')[0]}
                                                        </div>
                                                        <span>{m.user?.name || 'System Auto'}</span>
                                                    </div>
                                                </td>

                                                {/* Reference / Notes */}
                                                <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                                                    <div className="flex items-center gap-1.5">
                                                        {m.reference && (
                                                            <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground shrink-0">
                                                                {m.reference}
                                                            </span>
                                                        )}
                                                        <span className="text-xs truncate">{m.notes || 'Routine stock record'}</span>
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
        </AppLayout>
    );
}
