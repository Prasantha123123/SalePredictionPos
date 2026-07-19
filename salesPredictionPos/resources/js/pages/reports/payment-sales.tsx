import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { CreditCard, Filter, PieChart as PieIcon, Printer, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';

interface PaymentRow {
    method: string;
    key: string;
    transactions: number;
    revenue: number;
    percentage: number;
}

interface Props {
    paymentReport: PaymentRow[];
    grandTotal: number;
    filters: { start_date?: string; end_date?: string };
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function PaymentReport({ paymentReport = [], grandTotal = 0, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reports/payment-sales', { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        router.get('/reports/payment-sales', {}, { preserveState: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Payment Method Report', href: '/reports/payment-sales' },
            ]}
        >
            <Head title="Payment Method Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Payment Gateway & Tender Distribution
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Breakdown of Cash, Credit/Debit Cards, Mobile Wallets, and Bank Transfers.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                        <Printer className="size-3.5" />
                        <span>Print</span>
                    </Button>
                </div>

                {/* Filter Form */}
                <form onSubmit={handleSearch} className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Filter className="size-3.5 text-blue-500" />
                        <span>Filter Period</span>
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
                        Filter
                    </Button>
                    <Button type="button" onClick={handleReset} variant="outline" className="h-9 px-3 rounded-xl text-xs">
                        Reset
                    </Button>
                </form>

                {/* Grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Donut Chart */}
                    <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-foreground">Tender Share Donut Chart</h3>
                        <div className="h-64 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentReport} dataKey="revenue" nameKey="method" cx="50%" cy="50%" innerRadius={50} outerRadius={85} label>
                                        {paymentReport.map((_, idx) => (
                                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, 'Revenue']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="lg:col-span-7 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Payment Tender</th>
                                    <th className="px-4 py-3.5 text-center">Transactions Count</th>
                                    <th className="px-4 py-3.5 text-right">Percentage Share</th>
                                    <th className="px-4 py-3.5 text-right">Total Tender Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {paymentReport.map((p, i) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span>{p.method}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-bold">{p.transactions} txns</td>
                                        <td className="px-4 py-3.5 text-right font-bold text-blue-600 dark:text-blue-400">{p.percentage}%</td>
                                        <td className="px-4 py-3.5 text-right font-black text-foreground">{formatCurrency(p.revenue)}</td>
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
