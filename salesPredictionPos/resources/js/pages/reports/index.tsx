import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Award,
    BarChart3,
    Box,
    Calendar,
    CreditCard,
    DollarSign,
    Download,
    FileSpreadsheet,
    Package,
    PieChart as PieIcon,
    Printer,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface Props {
    summary: {
        todaySales: number;
        yesterdaySales: number;
        weeklySales: number;
        monthlySales: number;
        yearlySales: number;
        todayOrders: number;
        totalOrders: number;
        totalProductsSold: number;
        averageOrderValue: number;
        grossRevenue: number;
        discountGiven: number;
        totalProfit: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        topSellingProduct: string;
        bestSellingCategory: string;
        mostUsedPaymentMethod: string;
        salesGrowthPct: number;
    };
    salesTrend: { date: string; revenue: number; orders: number }[];
    topProducts: { name: string; units: number; revenue: number }[];
    categoryBreakdown: { name: string; value: number }[];
    paymentDistribution: { name: string; value: number; count: number }[];
    revenueVsProfit: { day: string; revenue: number; profit: number }[];
    cashierPerformance: { name: string; orders: number; sales: number }[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function AnalyticsDashboard({
    summary,
    salesTrend = [],
    topProducts = [],
    categoryBreakdown = [],
    paymentDistribution = [],
    revenueVsProfit = [],
    cashierPerformance = [],
}: Props) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Analytics Dashboard', href: '/reports' }]}>
            <Head title="Analytics & Executive Reports - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <span>Executive Analytics & Intelligence</span>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                REAL-TIME
                            </Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Comprehensive sales, profit margins, product velocity, and store performance statistics.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrint} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                            <Printer className="size-3.5" />
                            <span>Print Report</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Today Sales */}
                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs relative overflow-hidden space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Today's Sales</span>
                            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                <DollarSign className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-foreground">{formatCurrency(summary.todaySales)}</div>
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                            {summary.salesGrowthPct >= 0 ? (
                                <span className="text-emerald-500 flex items-center">
                                    <ArrowUpRight className="size-3.5" /> +{summary.salesGrowthPct}%
                                </span>
                            ) : (
                                <span className="text-rose-500 flex items-center">
                                    <ArrowDownRight className="size-3.5" /> {summary.salesGrowthPct}%
                                </span>
                            )}
                            <span className="text-muted-foreground font-normal">vs yesterday</span>
                        </div>
                    </div>

                    {/* Gross Revenue */}
                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs relative overflow-hidden space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Gross Revenue</span>
                            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                <TrendingUp className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-foreground">{formatCurrency(summary.grossRevenue)}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                            Total Orders: <span className="font-bold text-foreground">{summary.totalOrders}</span>
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs relative overflow-hidden space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Net Profit Margin</span>
                            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                <Wallet className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{formatCurrency(summary.totalProfit)}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                            Discounts Given: <span className="font-bold text-foreground">{formatCurrency(summary.discountGiven)}</span>
                        </div>
                    </div>

                    {/* Avg Order Value */}
                    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs relative overflow-hidden space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Avg Order Value</span>
                            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <ShoppingCart className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-foreground">{formatCurrency(summary.averageOrderValue)}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                            Products Sold: <span className="font-bold text-foreground">{summary.totalProductsSold} items</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Yesterday</span>
                        <div className="font-bold text-foreground mt-0.5">{formatCurrency(summary.yesterdaySales)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">This Week</span>
                        <div className="font-bold text-foreground mt-0.5">{formatCurrency(summary.weeklySales)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">This Month</span>
                        <div className="font-bold text-foreground mt-0.5">{formatCurrency(summary.monthlySales)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Top Product</span>
                        <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">{summary.topSellingProduct}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Top Category</span>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{summary.bestSellingCategory}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/60 text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Top Payment</span>
                        <div className="font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">{summary.mostUsedPaymentMethod}</div>
                    </div>
                </div>

                {/* Charts Row 1: Sales Trend & Top 10 Selling Products */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sales Trend Line/Area Chart */}
                    <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">30-Day Sales Trend</h3>
                                <p className="text-[11px] text-muted-foreground">Daily gross revenue trajectory across completed transactions</p>
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                Area Chart
                            </Badge>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="gray" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="gray" />
                                    <Tooltip
                                        formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, 'Revenue']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top 10 Selling Products Bar Chart */}
                    <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Top 10 Selling Products</h3>
                                <p className="text-[11px] text-muted-foreground">Highest revenue generating merchandise</p>
                            </div>
                            <Award className="size-4 text-amber-500" />
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="gray" />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="gray" width={80} />
                                    <Tooltip
                                        formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, 'Revenue']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2: Category Pie & Revenue vs Profit Line */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Category Sales Pie */}
                    <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Sales by Category</h3>
                                <p className="text-[11px] text-muted-foreground">Percentage revenue contribution</p>
                            </div>
                            <PieIcon className="size-4 text-blue-500" />
                        </div>
                        <div className="h-60 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                        {categoryBreakdown.map((entry, index) => (
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

                    {/* Revenue vs Profit 7-Day Line Chart */}
                    <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Revenue vs Net Profit (Last 7 Days)</h3>
                                <p className="text-[11px] text-muted-foreground">Comparing gross turnover against COGS profit margin</p>
                            </div>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold">
                                Dual Line
                            </Badge>
                        </div>
                        <div className="h-60 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueVsProfit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="gray" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="gray" />
                                    <Tooltip
                                        formatter={(val: any) => [`Rs. ${Number(val || 0).toLocaleString()}`, 'Amount']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} name="Gross Revenue" />
                                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} name="Net Profit" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Cashier Performance Table */}
                <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Cashier Leaderboard & Performance</h3>
                            <p className="text-[11px] text-muted-foreground">Staff sales volume and transactions processed</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Cashier Staff</th>
                                    <th className="px-4 py-3 text-center">Orders Completed</th>
                                    <th className="px-4 py-3 text-right">Total Revenue Processed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {cashierPerformance.map((c, i) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-bold text-foreground">{c.name}</td>
                                        <td className="px-4 py-3 text-center font-bold text-muted-foreground">{c.orders} orders</td>
                                        <td className="px-4 py-3 text-right font-black text-foreground">{formatCurrency(c.sales)}</td>
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
