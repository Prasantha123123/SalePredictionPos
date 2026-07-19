import { Head } from '@inertiajs/react';
import { AlertTriangle, Box, DollarSign, PackageX, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface InventoryItemRow {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category: string;
    stock: number;
    low_stock_threshold: number;
    cost: number;
    price: number;
    total_cost_value: number;
    total_retail_value: number;
    status: string;
}

interface Props {
    inventoryList: InventoryItemRow[];
    summary: {
        currentStock: number;
        lowStock: number;
        outOfStock: number;
        stockCostValue: number;
        stockRetailValue: number;
    };
}

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function InventoryReport({ inventoryList = [], summary }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Inventory Valuation Report', href: '/reports/inventory-sales' },
            ]}
        >
            <Head title="Inventory Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Inventory Stock & Asset Valuation Report
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Audit stock levels, low-stock warnings, cost valuation, and potential retail profit.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                        <Printer className="size-3.5" />
                        <span>Print</span>
                    </Button>
                </div>

                {/* Summary KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <span className="text-xs font-semibold text-muted-foreground">Total Stock Units</span>
                        <div className="text-2xl font-black text-foreground mt-1">{summary.currentStock} units</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <span className="text-xs font-semibold text-amber-500">Low Stock Alerts</span>
                        <div className="text-2xl font-black text-amber-500 mt-1">{summary.lowStock} SKUs</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <span className="text-xs font-semibold text-rose-500">Out of Stock</span>
                        <div className="text-2xl font-black text-rose-500 mt-1">{summary.outOfStock} SKUs</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <span className="text-xs font-semibold text-muted-foreground">Asset Cost Valuation</span>
                        <div className="text-xl font-black text-foreground mt-1">{formatCurrency(summary.stockCostValue)}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                        <span className="text-xs font-semibold text-emerald-500">Asset Retail Valuation</span>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary.stockRetailValue)}</div>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Product Name</th>
                                    <th className="px-4 py-3.5 text-left">SKU / Barcode</th>
                                    <th className="px-4 py-3.5 text-left">Category</th>
                                    <th className="px-4 py-3.5 text-right">Cost Price</th>
                                    <th className="px-4 py-3.5 text-right">Retail Price</th>
                                    <th className="px-4 py-3.5 text-center">In Stock</th>
                                    <th className="px-4 py-3.5 text-center">Stock Status</th>
                                    <th className="px-4 py-3.5 text-right">Total Cost Value</th>
                                    <th className="px-4 py-3.5 text-right">Total Retail Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {inventoryList.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-foreground">{item.name}</td>
                                        <td className="px-4 py-3.5 font-mono text-muted-foreground">{item.sku}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground">{item.category}</td>
                                        <td className="px-4 py-3.5 text-right text-muted-foreground">{formatCurrency(item.cost)}</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-foreground">{formatCurrency(item.price)}</td>
                                        <td className="px-4 py-3.5 text-center font-extrabold">{item.stock}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <Badge
                                                className={
                                                    item.status === 'Out of Stock'
                                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                        : item.status === 'Low Stock'
                                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                }
                                            >
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-bold text-muted-foreground">{formatCurrency(item.total_cost_value)}</td>
                                        <td className="px-4 py-3.5 text-right font-black text-foreground">{formatCurrency(item.total_retail_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
