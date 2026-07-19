import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    Calendar,
    FileSpreadsheet,
    Filter,
    FolderKanban,
    PieChart as PieIcon,
    Printer,
    TrendingUp,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface CategoryRow {
    id: number;
    name: string;
    products_count: number;
    quantity_sold: number;
    revenue: number;
    profit: number;
}

interface Props {
    categories: CategoryRow[];
    filters: { start_date?: string; end_date?: string };
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function CategorySalesReport({ categories = [], filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reports/category-sales', { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        router.get('/reports/category-sales', {}, { preserveState: true });
    };

    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Category Sales Report', href: '/reports/category-sales' },
            ]}
        >
            <Head title="Category Sales Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Category Sales & Share Breakdown
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Analyze revenue composition and profit contribution per category segment.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                            <Printer className="size-3.5" />
                            <span>Print</span>
                        </Button>
                    </div>
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

                {/* Visual Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Category Revenue Pie Chart */}
                    <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Category Revenue Share</h3>
                            <PieIcon className="size-4 text-blue-500" />
                        </div>
                        <div className="h-64 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categories} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {categories.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

                    {/* Category Profit Bar Chart */}
                    <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Category Profitability Comparison</h3>
                            <BarChart3 className="size-4 text-emerald-500" />
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="gray" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="gray" />
                                    <Tooltip
                                        formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, 'Profit']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Category Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Category Name</th>
                                    <th className="px-4 py-3.5 text-center">Catalog SKUs</th>
                                    <th className="px-4 py-3.5 text-center">Quantity Sold</th>
                                    <th className="px-4 py-3.5 text-right">Total Revenue</th>
                                    <th className="px-4 py-3.5 text-right">Revenue Share</th>
                                    <th className="px-4 py-3.5 text-right">Net Profit Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {categories.map((c) => {
                                    const sharePct = totalRevenue > 0 ? round((c.revenue / totalRevenue) * 100, 1) : 0;
                                    return (
                                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3.5 font-bold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-2 rounded-full bg-blue-500" />
                                                    <span>{c.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-bold text-muted-foreground">{c.products_count} SKUs</td>
                                            <td className="px-4 py-3.5 text-center font-bold">{c.quantity_sold} units</td>
                                            <td className="px-4 py-3.5 text-right font-black text-foreground">{formatCurrency(c.revenue)}</td>
                                            <td className="px-4 py-3.5 text-right font-bold text-blue-600 dark:text-blue-400">{sharePct}%</td>
                                            <td className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(c.profit)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function round(val: number, decimals: number) {
    return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
}
