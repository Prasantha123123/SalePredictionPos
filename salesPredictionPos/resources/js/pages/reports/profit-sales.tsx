import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { DollarSign, Filter, Percent, Printer, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface Props {
    summary: {
        grossRevenue: number;
        cogs: number;
        grossProfit: number;
        operatingExpenses: number;
        netProfit: number;
        marginPct: number;
    };
    filters: { start_date?: string; end_date?: string };
}

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ProfitReport({ summary, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reports/profit-sales', { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        router.get('/reports/profit-sales', {}, { preserveState: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Profit Loss Audit Report', href: '/reports/profit-sales' },
            ]}
        >
            <Head title="Profit Loss Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Profit & Loss Statement (P&L Audit)
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Calculate gross turnover, COGS merchandise expense, overhead expenses, and net profit margin.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                        <Printer className="size-3.5" />
                        <span>Print Statement</span>
                    </Button>
                </div>

                {/* Filter Form */}
                <form onSubmit={handleSearch} className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Filter className="size-3.5 text-blue-500" />
                        <span>Audit Timeframe</span>
                    </div>

                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-background w-40"
                    />

                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-background w-40"
                    />

                    <Button type="submit" className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                        Filter Audit
                    </Button>
                    <Button type="button" onClick={handleReset} variant="outline" className="h-9 px-3 rounded-xl text-xs">
                        Reset
                    </Button>
                </form>

                {/* P&L Statement Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Revenue Card */}
                    <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Turnover Revenue</span>
                        <div className="text-3xl font-black text-foreground">{formatCurrency(summary.grossRevenue)}</div>
                        <p className="text-[11px] text-muted-foreground">Total register sales collected before expenses</p>
                    </div>

                    {/* COGS & Expenses Card */}
                    <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-2">
                        <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Cost of Goods + Expenses</span>
                        <div className="text-3xl font-black text-rose-500">{formatCurrency(summary.cogs + summary.operatingExpenses)}</div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>COGS: {formatCurrency(summary.cogs)}</span>
                            <span>Overheads: {formatCurrency(summary.operatingExpenses)}</span>
                        </div>
                    </div>

                    {/* Net Profit Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-card to-blue-500/10 border border-emerald-500/30 shadow-lg space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Net Profit</span>
                            <Badge className="bg-emerald-500/20 text-emerald-600 font-extrabold">{summary.marginPct}% Margin</Badge>
                        </div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.netProfit)}</div>
                        <p className="text-[11px] text-muted-foreground">Clean bottom-line profit after all operational deductions</p>
                    </div>
                </div>

                {/* Structured Breakdown Table */}
                <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-foreground">Income Statement Summary Table</h3>
                    <div className="divide-y divide-border/40 text-xs">
                        <div className="py-3 flex justify-between items-center font-semibold">
                            <span>Gross Checkout Revenue</span>
                            <span className="font-bold text-foreground">{formatCurrency(summary.grossRevenue)}</span>
                        </div>
                        <div className="py-3 flex justify-between items-center text-muted-foreground">
                            <span>Less: Cost of Goods Sold (Merchandise Wholesale Cost)</span>
                            <span className="font-mono text-rose-500">-{formatCurrency(summary.cogs)}</span>
                        </div>
                        <div className="py-3 flex justify-between items-center font-bold text-blue-600 dark:text-blue-400 bg-muted/30 px-3 rounded-xl">
                            <span>Equals: Gross Profit Margin</span>
                            <span>{formatCurrency(summary.grossProfit)}</span>
                        </div>
                        <div className="py-3 flex justify-between items-center text-muted-foreground">
                            <span>Less: Recorded Operating Overhead Expenses (Utilities, Salaries, Rent)</span>
                            <span className="font-mono text-rose-500">-{formatCurrency(summary.operatingExpenses)}</span>
                        </div>
                        <div className="py-4 flex justify-between items-center text-base font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 rounded-xl border border-emerald-500/20">
                            <span>Net Operating Profit</span>
                            <span>{formatCurrency(summary.netProfit)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
