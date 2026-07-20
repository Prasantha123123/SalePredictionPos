import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AlertOctagon, AlertTriangle, Calendar, Filter, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface BatchRow {
    id: number;
    product_name: string;
    sku: string;
    batch_number: string;
    quantity: number;
    cost_price: number;
    expiry_date: string | null;
    days_remaining: number | null;
    status: 'expired' | 'active';
}

interface Props {
    batches: BatchRow[];
    summary: {
        expiredLoss: number;
        totalWastedItems: number;
        activeBatchesCount: number;
        totalAlertsCount: number;
    };
    filters: {
        filter?: string;
    };
}

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ExpiryReport({ batches = [], summary, filters }: Props) {
    const [filter, setFilter] = useState(filters.filter || 'all');

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        router.get('/reports/expiry-report', { filter: newFilter }, { preserveState: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Expiry & Waste Report', href: '/reports/expiry-report' },
            ]}
        >
            <Head title="Expiry & Waste Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <span>Expiry & Stock Waste Audit</span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] uppercase font-black">
                                FEFO Compliant
                            </Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Audit stock batches by expiration dates, monitor wasted inventory value, and prevent expired sales.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                        <Printer className="size-3.5" />
                        <span>Print Audit</span>
                    </Button>
                </div>

                {/* Filter Pills */}
                <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground mr-2">
                        <Filter className="size-3.5 text-blue-500" />
                        <span>Auditing Filter</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { value: 'all', label: 'All Alerts' },
                            { value: 'expired', label: 'Expired Items' },
                            { value: 'today', label: 'Expiring Today' },
                            { value: 'week', label: 'Expiring This Week' },
                            { value: 'month', label: 'Expiring This Month' }
                        ].map((btn) => (
                            <button
                                key={btn.value}
                                onClick={() => handleFilterChange(btn.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    filter === btn.value
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Metrics Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                        <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Total Expired Loss</span>
                        <div className="text-2xl font-black text-rose-600 mt-2">{formatCurrency(summary.expiredLoss)}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Sunk cost of products currently past expiry</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Wasted Quantity</span>
                        <div className="text-2xl font-black text-foreground mt-2">{summary.totalWastedItems} units</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Total items in active status needing disposal</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Active Alerts</span>
                        <div className="text-2xl font-black text-amber-600 mt-2">{summary.activeBatchesCount} batches</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Expiring within upcoming 30-day window</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border border-emerald-500/20 shadow-xs flex flex-col justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Safe Stock Buffer</span>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">Verified</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Batches expiring after 30 days are safe</p>
                    </div>
                </div>

                {/* Expiry Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Product / SKU</th>
                                    <th className="px-4 py-3.5 text-left">Batch Number</th>
                                    <th className="px-4 py-3.5 text-center">Batch Quantity</th>
                                    <th className="px-4 py-3.5 text-right">Cost Value</th>
                                    <th className="px-4 py-3.5 text-center">Expiry Date</th>
                                    <th className="px-4 py-3.5 text-center">Time Remaining</th>
                                    <th className="px-4 py-3.5 text-center">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {batches.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground font-bold">
                                            No stock batches match the active filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    batches.map((b) => {
                                        const days = b.days_remaining;
                                        let badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                        let badgeLabel = 'Safe';
                                        if (days !== null) {
                                            if (days < 0) {
                                                badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                                                badgeLabel = 'Expired';
                                            } else if (days <= 3) {
                                                badgeColor = 'bg-orange-500/10 text-orange-600 border-orange-500/20';
                                                badgeLabel = 'Critical (≤3 days)';
                                            } else if (days <= 30) {
                                                badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                                                badgeLabel = 'Warning (≤30 days)';
                                            }
                                        }

                                        return (
                                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <div className="font-bold text-foreground">{b.product_name}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{b.sku}</div>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono font-bold text-muted-foreground">{b.batch_number}</td>
                                                <td className="px-4 py-3.5 text-center font-bold">{b.quantity} units</td>
                                                <td className="px-4 py-3.5 text-right font-semibold">{formatCurrency(b.cost_price * b.quantity)}</td>
                                                <td className="px-4 py-3.5 text-center font-bold text-foreground">{b.expiry_date || 'N/A'}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {days !== null ? (
                                                        days < 0 ? (
                                                            <span className="text-rose-600 font-extrabold flex items-center justify-center gap-1">
                                                                <AlertOctagon className="size-3.5" />
                                                                <span>{Math.abs(days)} days ago</span>
                                                            </span>
                                                        ) : (
                                                            <span className="font-bold text-foreground">
                                                                {days} days left
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <Badge className={`${badgeColor} font-bold text-[10px] uppercase border`}>
                                                        {badgeLabel}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
